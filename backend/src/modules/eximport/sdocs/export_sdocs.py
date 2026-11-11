from pathlib import Path

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.image_embedding_dto import ImageObjectIdentifier
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataReadResolved,
)
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.sdocs.sdoc_export_schema import (
    SourceDocumentExportCollection,
    SourceDocumentExportSchema,
)
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_exceptions import (
    WeaviateObjectIDNotFoundException,
)
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.pipeline_graph import pipeline_registry


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
    # 2.5. The source document's word frequencies (sdoc word frequencies) [WordFrequencyORM]
    # 3. Processed data of the source document (content, html, tokens, sentences, times) [SourceDocumentDataORM]
    # 4. Embeddings of the source document
    # 4.1. Document Embeddings
    # 4.2. Sentence Embeddings
    # 4.3. Image Embeddings
    # Optional artefacts are exported only if their step finished: a document of a
    # project without e.g. sentence similarity search has no sentence embeddings.

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
        steps = pipeline_registry.graph().steps(DocType(sdoc.doctype))
        step_status: dict[str, int | None] = {
            step.value: getattr(sdoc, step.value) for step in steps
        }

        def is_finished(step: JobType) -> bool:
            return step_status.get(step.value) == SDocStatus.finished.value

        # Word frequencies
        word_frequencies = (
            [(wf.word, wf.count) for wf in sdoc.word_frequencies]
            if is_finished(JobType.TEXT_WORD_FREQUENCY)
            else []
        )

        client = WeaviateRepo().get_client()
        # Get document embeddings
        doc_embedding = None
        if is_finished(
            JobType.TEXT_DOCUMENT_EMBEDDING
        ) and crud_document_embedding._tenant_exists(
            client=client, project_id=sdoc.project_id
        ):
            try:
                doc_embedding = crud_document_embedding.read(
                    client=client,
                    project_id=sdoc.project_id,
                    id=DocumentObjectIdentifier(sdoc_id=sdoc.id),
                )
            except WeaviateObjectIDNotFoundException:
                doc_embedding = None

        # Get sentence embeddings
        sentence_embeddings = []
        if is_finished(
            JobType.TEXT_SENTENCE_EMBEDDING
        ) and crud_sentence_embedding._tenant_exists(
            client=client, project_id=sdoc.project_id
        ):
            # Weaviate returns the objects unordered; the import assigns the
            # sentence ids by position
            sentence_embeddings = [
                se.embedding
                for se in sorted(
                    crud_sentence_embedding.read_by_sdoc_id(
                        client=client, project_id=sdoc.project_id, sdoc_id=sdoc.id
                    ),
                    key=lambda se: se.id.sentence_id,
                )
            ]
            # not one embedding per sentence: export them as missing, the import
            # leaves the step not planned
            if len(sentence_embeddings) != len(sdoc_data.sentence_starts):
                sentence_embeddings = []

        # Get image embeddings
        image_embedding = None
        if is_finished(JobType.IMAGE_EMBEDDING) and crud_image_embedding._tenant_exists(
            client=client, project_id=sdoc.project_id
        ):
            try:
                image_embedding = crud_image_embedding.read(
                    client=client,
                    project_id=sdoc.project_id,
                    id=ImageObjectIdentifier(sdoc_id=sdoc.id),
                )
            except WeaviateObjectIDNotFoundException:
                image_embedding = None

        # Create export schema for the document
        export_schema = SourceDocumentExportSchema(
            filename=sdoc.filename,
            name=sdoc.name,
            doctype=sdoc.doctype,
            status=sdoc.processed_status,
            step_status=step_status,
            folder_name=sdoc.folder.name,
            folder_parent_name=sdoc.folder.parent.name if sdoc.folder.parent else None,
            tags=tags,
            word_frequencies=word_frequencies,
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
            document_embedding=doc_embedding,
            sentence_embeddings=sentence_embeddings,
            image_embedding=image_embedding,
        )

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
