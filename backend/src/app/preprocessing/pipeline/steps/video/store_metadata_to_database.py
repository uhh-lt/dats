from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from app.preprocessing.pipeline.model.video.preprovideodoc import PreProVideoDoc
from app.preprocessing.pipeline.steps.common.persist_sdoc_data import persist_sdoc_data
from app.preprocessing.pipeline.steps.common.persist_tags import persist_tags
from app.preprocessing.pipeline.steps.text.write_pptd_to_database import (
    _persist_sdoc_word_frequencies,
)

repo: RepoService = RepoService()
sql: SQLService = SQLService()


def _persist_sdoc_metadata(
    db: Session,
    sdoc_db_obj: SourceDocumentORM,
    ppvd: PreProVideoDoc,
    ppad: PreProAudioDoc,
    pptd: PreProTextDoc,
) -> None:
    sdoc_id = sdoc_db_obj.id
    sdoc = SourceDocumentRead.model_validate(sdoc_db_obj)
    ppvd.metadata["url"] = str(RepoService().get_sdoc_url(sdoc=sdoc))
    logger.info(f"Passing ppdt keywords {pptd.metadata['keywords']} to ppvd")
    ppvd.metadata["transcription_keywords"] = pptd.metadata["keywords"]
    ppvd.metadata["language"] = pptd.metadata["language"]

    project_metadata = [
        ProjectMetadataRead.model_validate(pm)
        for pm in crud_project.read(db=db, id=ppvd.project_id).metadata_
        if pm.doctype == DocType.video
    ]
    project_metadata_map = {str(m.key): m for m in project_metadata}

    # we create SourceDocumentMetadata for every project metadata
    metadata_create_dtos = []
    for project_metadata_key, project_metadata in project_metadata_map.items():
        if project_metadata_key in ppvd.metadata.keys():
            metadata_create_dtos.append(
                SourceDocumentMetadataCreate.with_metatype(
                    value=ppvd.metadata[project_metadata_key],
                    source_document_id=sdoc_id,
                    project_metadata_id=project_metadata.id,
                    metatype=project_metadata.metatype,
                )
            )
        else:
            metadata_create_dtos.append(
                SourceDocumentMetadataCreate.with_metatype(
                    source_document_id=sdoc_id,
                    project_metadata_id=project_metadata.id,
                    metatype=project_metadata.metatype,
                )
            )

    crud_sdoc_meta.create_multi(db=db, create_dtos=metadata_create_dtos)


def store_metadata_and_data_to_database(cargo: PipelineCargo) -> PipelineCargo:
    ppvd: PreProVideoDoc = cargo.data["ppvd"]
    ppad: PreProAudioDoc = cargo.data["ppad"]
    pptd: PreProTextDoc = cargo.data["pptd"]
    video_sdoc_id: int = cargo.data["sdoc_id"]

    with sql.db_session() as db:
        try:
            sdoc_db_obj = crud_sdoc.read(db=db, id=video_sdoc_id)
            # persist SourceDocument Metadata
            _persist_sdoc_metadata(
                db=db, sdoc_db_obj=sdoc_db_obj, ppvd=ppvd, ppad=ppad, pptd=pptd
            )

            # persist tags
            persist_tags(db=db, sdoc_db_obj=sdoc_db_obj, ppd=ppvd)

            # persist SourceDocument Data
            persist_sdoc_data(db=db, sdoc_db_obj=sdoc_db_obj, pptd=pptd, ppad=ppad)

            # persist WordFrequencies
            _persist_sdoc_word_frequencies(db=db, sdoc_db_obj=sdoc_db_obj, pptd=pptd)

        except Exception as e:
            logger.error(
                f"Error while persisting SourceDocument Metadata "
                f"for {ppvd.filename}: {e}"
            )
            # FIXME: this is not working because we commmit the sessions in the cruds!
            # To fix it, we have to use flush instead of commit in the cruds and commit
            #  via the context manager, i.e., session autocommit...
            # But this would require huge changes!
            db.rollback()
            raise e
        else:
            logger.info(f"Persisted SourceDocument Metadata " f"for {ppvd.filename}!")

    return cargo
