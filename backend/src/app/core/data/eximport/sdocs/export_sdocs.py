from pathlib import Path
from typing import List

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataReadResolved,
)
from app.core.data.eximport.no_data_export_error import NoDataToExportError
from app.core.data.eximport.sdocs.sdoc_export_schema import (
    SourceDocumentExportCollection,
    SourceDocumentExportSchema,
)
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.weaviate_service import WeaviateService
from loguru import logger
from sqlalchemy.orm import Session

vector_index = WeaviateService()


def export_selected_sdocs(
    db: Session,
    repo: RepoService,
    project_id: int,
    sdoc_ids: List[int],
) -> Path:
    sdocs = crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
    return __export_sdocs(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_selected_sdocs_export",
        sdocs=sdocs,
    )


def export_all_sdocs(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> Path:
    sdocs = crud_sdoc.read_by_project(db=db, proj_id=project_id)
    return __export_sdocs(
        db=db,
        repo=repo,
        fn=f"project_{project_id}_all_sdocs_export",
        sdocs=sdocs,
    )


def __export_sdocs(
    db: Session,
    repo: RepoService,
    fn: str,
    sdocs: List[SourceDocumentORM],
) -> Path:
    if len(sdocs) == 0:
        raise NoDataToExportError("No source documents to export.")

    # We export these things for each source document:
    # 1. The source document itself (the raw file) [Repo]
    # 2. Data that is attached to the source document
    # 2.1. Info about the source document itself (name, filename, doctype, status) [SourceDocumentORM]
    # 2.2. The source document's metadata (sdoc metadata) [SourceDocumentMetadataORM]
    # 2.3. The source document's tags (sdoc tags) [DocumentTagORM]
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
        repo.get_path_to_sdoc_file(
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
        tags = [tag.name for tag in sdoc.document_tags]

        # Document links
        links = [
            link.linked_source_document_filename
            for link in sdoc.source_document_links
            if link.linked_source_document_filename is not None
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

        # Get document embeddings
        doc_embedding = vector_index.get_document_embedding_by_sdoc_id(sdoc.id)
        logger.info(
            f"Document embedding shape for sdoc {sdoc.id}: {doc_embedding.shape}"
        )
        doc_embedding = doc_embedding.tolist()

        # Get sentence embeddings
        sentence_embeddings = vector_index.get_sentence_embeddings_by_sdoc_id(sdoc.id)
        logger.info(
            f"Sentence embedding shape for sdoc {sdoc.id}: {sentence_embeddings.shape}"
        )
        sentence_embeddings = sentence_embeddings.tolist()

        # Get image embeddings
        image_embeddings = None
        if sdoc.doctype == "image":
            image_embeddings = vector_index.get_image_embedding_by_sdoc_id(sdoc.id)
            logger.info(
                f"Image embedding shape for sdoc {sdoc.id}: {image_embeddings.shape}"
            )
            image_embeddings = image_embeddings.tolist()

        # Create export schema for the document
        export_schema = SourceDocumentExportSchema(
            filename=sdoc.filename,
            name=sdoc.name,
            doctype=sdoc.doctype,
            status=sdoc.status,
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
            image_embedding=image_embeddings,
        )

        export_collection.append(export_schema)

    # Create a DataFrame from all export schemas and write to a file
    export_collection_obj = SourceDocumentExportCollection(
        source_documents=export_collection
    )
    export_df_file = repo.write_df_to_temp_file(
        df=export_collection_obj.to_dataframe(), fn="document_export_data"
    )
    all_files.append(export_df_file)

    # Create and return a zip file with all exported files
    return repo.write_files_to_temp_zip_file(files=all_files, fn=fn)
