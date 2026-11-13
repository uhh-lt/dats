from pathlib import Path

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.doc.source_document_status_rules import document_status
from core.doc.source_document_step_status_crud import crud_sdoc_step_status
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataReadResolved,
)
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.sdocs.artefact_archive import archive_modules
from modules.eximport.sdocs.sdoc_export_schema import (
    SourceDocumentExportCollection,
    SourceDocumentExportSchema,
)
from repos.filesystem_repo import FilesystemRepo


def export_selected_sdocs(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
    sdoc_ids: list[int],
) -> Path:
    sdocs = crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
    return __export_sdocs(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_selected_docs",
        sdocs=sdocs,
    )


def export_all_sdocs(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    sdocs = crud_sdoc.read_by_project(db=db, project_id=project_id, only_finished=False)
    return __export_sdocs(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_docs",
        sdocs=sdocs,
    )


def __export_sdocs(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    sdocs: list[SourceDocumentORM],
) -> Path:
    if len(sdocs) == 0:
        raise NoDataToExportError("No source documents to export.")

    # We export these things for each source document:
    # 1. The source document itself (the raw file) [Filesystem]
    # 2. Data that is attached to the source document
    # 2.1. Info about the source document itself (name, filename, doctype, status of each step) [SourceDocumentORM]
    # 2.2. The source document's metadata (sdoc metadata) [SourceDocumentMetadataORM]
    # 2.3. The source document's tags (sdoc tags) [TagORM]
    # 2.4. The source document's folder [FolderORM]
    # 3. Processed data of the source document (content, html, tokens, sentences, times) [SourceDocumentDataORM]
    # 4. The artefacts with an archive module (embeddings, word frequencies, see
    # artefact_archive.py), only if their step finished: a document of a project
    # without e.g. sentence similarity search has no sentence embeddings.

    # Collect all files to be included in the export
    all_files = []

    # 1. The source document itself (the raw file)
    sdoc_files = [
        fsr.get_path_to_sdoc_file(
            SourceDocumentRead.model_validate(sdoc), raise_if_not_exists=True
        )
        for sdoc in sdocs
    ]
    all_files.extend(sdoc_files)

    # Create a collection of export data
    graph = pipeline_registry.graph()
    stored_status = crud_sdoc_step_status.read_by_sdocs(
        db=db, sdoc_ids=[sdoc.id for sdoc in sdocs]
    )
    export_collection = []
    for sdoc in sdocs:
        sdoc_data = sdoc.data
        if sdoc_data is None:
            raise ValueError(f"SourceDocument {sdoc.id} has no data, cannot export.")

        # Document tags
        tags = [tag.name for tag in sdoc.tags]

        # Document metadata
        sdoc_metadata_dtos = [
            SourceDocumentMetadataReadResolved.model_validate(sdoc_metadata)
            for sdoc_metadata in sdoc.metadata_
        ]
        metadata_list = []
        for metadata in sdoc_metadata_dtos:
            metadata_list.append(
                (metadata.project_metadata.key, metadata.get_value_serializable())
            )

        # Status of each pipeline step of the doctype, None = not planned
        doctype = DocType(sdoc.doctype)
        planned = stored_status[sdoc.id]
        step_status: dict[str, int | None] = {
            step.value: planned.get(step) for step in graph.steps(doctype)
        }

        export_schema = SourceDocumentExportSchema(
            filename=sdoc.filename,
            name=sdoc.name,
            doctype=sdoc.doctype,
            status=document_status(planned.values()),
            step_status=step_status,
            folder_name=sdoc.folder.name,
            folder_parent_name=sdoc.folder.parent.name if sdoc.folder.parent else None,
            tags=tags,
            word_frequencies=[],
            metadata=metadata_list,
            content=sdoc_data.content,
            html=sdoc_data.html,
            raw_html=sdoc_data.raw_html,
            token_starts=sdoc_data.token_starts,
            token_ends=sdoc_data.token_ends,
            sentence_starts=sdoc_data.sentence_starts,
            sentence_ends=sdoc_data.sentence_ends,
            token_time_starts=sdoc_data.token_time_starts,
            token_time_ends=sdoc_data.token_time_ends,
            sentence_embeddings=[],
        )

        # The artefacts with their own store: exported only if their step
        # finished and their data is complete, else the import leaves the step
        # not planned
        for artefact, module in archive_modules().items():
            step = graph.producer(doctype, artefact)
            if step is None or planned.get(step) != SDocStatus.finished:
                continue
            archived = export_schema.model_copy(update=module.read(sdoc))
            if module.is_complete(archived):
                export_schema = archived

        export_collection.append(export_schema)

    # Create a DataFrame from all export schemas and write to a file
    export_collection_obj = SourceDocumentExportCollection(
        source_documents=export_collection
    )
    export_df_file = fsr.write_df_to_temp_file(
        df=export_collection_obj.to_dataframe(), fn="document_export_data"
    )
    all_files.append(export_df_file)

    # Create and return a zip file with all exported files
    return fsr.write_files_to_temp_zip_file(files=all_files, fn=fn)
