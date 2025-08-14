from pathlib import Path

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
from modules.eximport.no_data_export_error import NoDataToExportError
from modules.eximport.sdocs.sdoc_export_schema import (
    SourceDocumentExportCollection,
    SourceDocumentExportSchema,
)
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo
from sqlalchemy.orm import Session


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
    sdocs = crud_sdoc.read_by_project(db=db, proj_id=project_id, only_finished=False)
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
    # 2.1. Info about the source document itself (name, filename, doctype, status) [SourceDocumentORM]
    # 2.2. The source document's metadata (sdoc metadata) [SourceDocumentMetadataORM]
    # 2.3. The source document's tags (sdoc tags) [TagORM]
    # 2.4. The source document's links (sdoc links) [SourceDocumentLinkORM]
    # 2.5. The source document's word frequencies (sdoc word frequencies) [WordFrequencyORM]
    # 3. Processed data of the source document (content, html, tokens, sentences, times) [SourceDocumentDataORM]
    # 4. Embeddings of the source document
    # 4.1. Document Embeddings
    # 4.2. Sentence Embeddings

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

        # Document links
        # We only want the resolved links, i.e., the ones that have a linked_source_document_id
        links = [
            link.linked_source_document_filename
            for link in sdoc.source_document_links
            if link.linked_source_document_filename is not None
            and link.linked_source_document_id is not None
            and link.parent_source_document_id is not None
        ]

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

        # Word frequencies
        word_frequencies = [(wf.word, wf.count) for wf in sdoc.word_frequencies]

        with WeaviateRepo().weaviate_session() as client:
            # Get document embeddings
            doc_embedding = crud_document_embedding.get_embedding(
                client=client,
                project_id=sdoc.project_id,
                id=DocumentObjectIdentifier(sdoc_id=sdoc.id),
            )

            # Get sentence embeddings
            sentence_embeddings = crud_sentence_embedding.get_embeddings_by_sdoc_id(
                client=client, project_id=sdoc.project_id, sdoc_id=sdoc.id
            )
            sentence_embeddings = [se.embedding for se in sentence_embeddings]

            # Get image embeddings
            image_embedding = None
            if sdoc.doctype == "image":
                image_embedding = crud_image_embedding.get_embedding(
                    client=client,
                    project_id=sdoc.project_id,
                    id=ImageObjectIdentifier(sdoc_id=sdoc.id),
                )

        # Create export schema for the document
        export_schema = SourceDocumentExportSchema(
            filename=sdoc.filename,
            name=sdoc.name,
            doctype=sdoc.doctype,
            status=sdoc.processed_status,
            tags=tags,
            links=links,
            word_frequencies=word_frequencies,
            metadata=metadata_list,
            content=sdoc_data.content,
            html=sdoc_data.html,
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
