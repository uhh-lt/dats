from loguru import logger

from common.doc_type_enum import DocType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataCreate
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_file_crud import crud_sdoc_file
from core.doc_processing.doc_processing_dto import (
    SdocInitJobInput,
    SdocInitJobOutput,
)
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from repos.db.sql_repo import SQLRepo
from repos.filesystem.temporary_file_crud import crud_temporary_file
from systems.artefact_system.artefact_service import ArtefactService
from systems.artefact_system.step_execution import start_steps
from systems.feature_system.feature_service import FeatureService
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


@register_job(
    job_type="sdoc_init",
    input_type=SdocInitJobInput,
    output_type=SdocInitJobOutput,
)
def handle_init_sdoc_job(payload: SdocInitJobInput, job: Job) -> SdocInitJobOutput:
    with sqlr.transaction() as db:
        # create sdoc (& optionally the corresponding folder); the unique
        # constraint on (project_id, filename) rejects a duplicate filename
        logger.info(f"Persisting SourceDocument for {payload.filename}...")
        create_dto = SourceDocumentCreate(
            filename=payload.filename,
            name=payload.filename,
            doctype=payload.doctype,
            project_id=payload.project_id,
            folder_id=payload.folder_id,
        )
        sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

        # plan the steps of the core artefacts and of the project's artefact
        # demand, read under the project share lock
        demand = FeatureService().read_artefact_demand(
            db=db, project_id=payload.project_id
        )
        roots = ArtefactService().plan_document(
            db=db, sdoc_id=sdoc_db_obj.id, doctype=payload.doctype, demand=demand
        )

        # create empty sdoc data
        crud_sdoc_data.create(
            db=db,
            create_dto=SourceDocumentDataCreate(
                id=sdoc_db_obj.id,
                content="",
                raw_html="",
                html="",
                token_starts=[],
                token_ends=[],
                sentence_starts=[],
                sentence_ends=[],
            ),
        )

        # create sdoc metadata
        crud_sdoc_meta.create_initial_metadata(
            db=db,
            project_id=payload.project_id,
            sdoc_id=sdoc_db_obj.id,
            doctype=payload.doctype,
        )

        # move the staged file in, before the commit: a failed commit leaves
        # an unused folder behind, never a document without its file
        crud_sdoc_file.move_in(
            project_id=payload.project_id,
            id=sdoc_db_obj.id,
            src=crud_temporary_file.path(
                id=payload.temporary_file_id, name=payload.filename
            ),
        )

        output = SdocInitJobOutput(
            sdoc_id=sdoc_db_obj.id,
            folder_id=sdoc_db_obj.folder_id,
            doctype=DocType(sdoc_db_obj.doctype),
        )
    crud_temporary_file.delete_if_empty(id=payload.temporary_file_id)

    # start the planned root steps of the new document
    start_steps(
        project_id=payload.project_id,
        sdoc_id=output.sdoc_id,
        steps=roots,
        settings=payload.settings,
    )
    return output
