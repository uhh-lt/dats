from pathlib import Path
from typing import Dict, List, Set, Tuple

import numpy as np
import pandas as pd
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_data import crud_sdoc_data
from app.core.data.crud.source_document_link import crud_sdoc_link
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.word_frequency import crud_word_frequency
from app.core.data.doc_type import DocType
from app.core.data.dto.search import ElasticSearchDocumentCreate
from app.core.data.dto.source_document import (
    SDocStatus,
    SourceDocumentCreate,
)
from app.core.data.dto.source_document_data import SourceDocumentDataCreate
from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.dto.word_frequency import WordFrequencyCreate
from app.core.data.eximport.sdocs.sdoc_export_schema import (
    SourceDocumentExportCollection,
)
from app.core.data.orm.project_metadata import ProjectMetadataORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.elasticsearch_service import ElasticSearchService
from app.core.db.index_type import IndexType
from app.core.db.weaviate_service import WeaviateService
from app.preprocessing.pipeline.steps.image.process.convert_to_webp_and_generate_thumbnail import (
    generate_thumbnails,
)
from loguru import logger
from sqlalchemy.orm import Session

vector_index = WeaviateService()
elastic_index = ElasticSearchService()
repo = RepoService()


class ImportSourceDocumentsError(Exception):
    def __init__(self, errors: List[str]) -> None:
        super().__init__(f"Errors occurred while importing source documents: {errors}")


def import_sdocs_to_proj(
    db: Session,
    path_to_dir: Path,
    project_id: int,
) -> List[int]:
    """
    Import source documents from a zip file into a project.
    Validates input data and ensures all required references exist.

    Args:
        db: Database session
        project_id: ID of the project to import documents into

    Returns:
        List of imported source document IDs

    Raises:
        ImportSourceDocumentsError: If validation fails or any required references are missing
    """

    # Find the data file (CSV) and the source files in the import directory
    data_file = None
    source_files = []
    for file_path in path_to_dir.glob("**/*"):
        if file_path.is_file():
            if file_path.name.endswith(".csv"):
                data_file = file_path
            else:
                source_files.append(file_path)

    if not data_file:
        raise ImportSourceDocumentsError(
            errors=["No data file (.csv) found in the zip archive"]
        )

    df = pd.read_csv(data_file)

    # Validate input data with our schema
    try:
        sdoc_collection = SourceDocumentExportCollection.from_dataframe(df)
    except Exception as e:
        logger.error(f"Failed to load document export data: {e}")
        raise ImportSourceDocumentsError(
            errors=[f"Invalid data format for source documents: {e}"]
        )

    logger.info(
        f"Importing {len(sdoc_collection.source_documents)} source documents..."
    )

    # 0. Get the project
    error_messages = []
    project = crud_project.read(db=db, id=project_id)

    # 1. Check if the source document file exists for each document in the collection
    source_file_by_name: Dict[str, Path] = {}
    for source_file in source_files:
        source_file_by_name[source_file.name] = source_file

    for sdoc in sdoc_collection.source_documents:
        if sdoc.filename not in source_file_by_name:
            error_messages.append(
                f"Source file not found for document '{sdoc.filename}'"
            )

    # 2. Check if documents with the same filename already exist in the project
    for sdoc in sdoc_collection.source_documents:
        existing_sdoc = crud_sdoc.read_by_filename(
            db=db, proj_id=project_id, filename=sdoc.filename, only_finished=False
        )
        if existing_sdoc is not None:
            error_messages.append(
                f"Source document with filename '{sdoc.filename}' already exists in project {project_id}"
            )

    # 3. Check if all tags exist
    needed_tags: Set[str] = set()
    for sdoc in sdoc_collection.source_documents:
        needed_tags.update(sdoc.tags)
    existing_tags = {tag.name: tag for tag in project.document_tags}
    for tag_name in needed_tags:
        if tag_name not in existing_tags:
            error_messages.append(
                f"Tag '{tag_name}' does not exist in project {project_id}"
            )

    # 4. Check if all links exist
    needed_links: Set[str] = set()
    for sdoc in sdoc_collection.source_documents:
        needed_links.update(sdoc.links)
    existing_sdocs = {sdoc.filename: sdoc for sdoc in project.source_documents}
    importing_sdocs = {sdoc.filename: sdoc for sdoc in sdoc_collection.source_documents}
    for link_name in needed_links:
        if link_name not in existing_sdocs and link_name not in importing_sdocs:
            error_messages.append(
                f"Linked source document '{link_name}' does neither exist in project {project_id} nor in the import data"
            )

    # 5. Check if all metadata keys exist
    needed_metadata_keys: Dict[DocType, Set[str]] = {}
    for sdoc in sdoc_collection.source_documents:
        for key, _ in sdoc.metadata:
            if DocType(sdoc.doctype) not in needed_metadata_keys:
                needed_metadata_keys[DocType(sdoc.doctype)] = set()
            needed_metadata_keys[DocType(sdoc.doctype)].add(key)
    existing_metadata: Dict[Tuple[DocType, str], ProjectMetadataORM] = {}
    for metadata in project.metadata_:
        existing_metadata[(DocType(metadata.doctype), metadata.key)] = metadata
    for doctype, keys in needed_metadata_keys.items():
        for key in keys:
            if (doctype, key) not in existing_metadata:
                error_messages.append(
                    f"Metadata key '{key}' for doctype '{doctype.name}' does not exist in project {project_id}"
                )

    # Raise an error if any checks failed
    if len(error_messages) > 0:
        logger.error(
            "The following errors occurred while importing source documents:\n"
            + "\n".join(error_messages)
        )
        raise ImportSourceDocumentsError(errors=error_messages)

    # Everything is valid, proceed with the import
    imported_sdoc_ids = []
    filename_to_id_map = {}
    for sdoc_export in sdoc_collection.source_documents:
        # 1. Move the source files to the project repository
        source_file = source_file_by_name[sdoc_export.filename]
        repo_path = repo.move_file_to_project_sdoc_files(
            proj_id=project_id, src_file=source_file
        )
        relative_url = str(repo_path.relative_to(repo.repo_root))
        # generate thumbnail if needed
        if DocType(sdoc_export.doctype) == DocType.image:
            generate_thumbnails(repo_path)

        # 2. Create the source documents in the database
        sdoc_create = SourceDocumentCreate(
            filename=sdoc_export.filename,
            name=sdoc_export.name,
            doctype=DocType(sdoc_export.doctype),
            project_id=project_id,
            status=SDocStatus[sdoc_export.status],
        )

        created_sdoc = crud_sdoc.create(db=db, create_dto=sdoc_create)
        imported_sdoc_ids.append(created_sdoc.id)
        filename_to_id_map[created_sdoc.filename] = created_sdoc.id

        # 3. Create the source document data in the database
        sdoc_data_create = SourceDocumentDataCreate(
            id=created_sdoc.id,
            repo_url=relative_url,
            content=sdoc_export.content,
            html=sdoc_export.html,
            token_starts=sdoc_export.token_starts,
            token_ends=sdoc_export.token_ends,
            sentence_starts=sdoc_export.sentence_starts,
            sentence_ends=sdoc_export.sentence_ends,
            token_time_starts=sdoc_export.token_time_starts,
            token_time_ends=sdoc_export.token_time_ends,
        )
        crud_sdoc_data.create(db=db, create_dto=sdoc_data_create)

        # 4. Link the source documents with the attached data (tags, metadata, word frequencies)
        # Tags
        tag_ids = [existing_tags[tag_name].id for tag_name in sdoc_export.tags]
        crud_document_tag.link_multiple_document_tags(
            db=db, sdoc_ids=[created_sdoc.id], tag_ids=tag_ids
        )

        # Word frequencies
        wf_create_dtos = [
            WordFrequencyCreate(sdoc_id=created_sdoc.id, word=word, count=count)
            for word, count in sdoc_export.word_frequencies
        ]
        crud_word_frequency.create_multi(db=db, create_dtos=wf_create_dtos)

        # Metadata
        metadata_create_dtos = []
        for key, value in sdoc_export.metadata:
            # Find project metadata to get the ID
            project_metadata = existing_metadata[(DocType(sdoc_export.doctype), key)]

            metadata_create = SourceDocumentMetadataCreate.with_metatype(
                metatype=project_metadata.metatype,
                source_document_id=created_sdoc.id,
                project_metadata_id=project_metadata.id,
                value=value,
            )
            metadata_create_dtos.append(metadata_create)
        crud_sdoc_meta.create_multi(db=db, create_dtos=metadata_create_dtos)

        # Links
        link_create_dtos = [
            SourceDocumentLinkCreate(
                parent_source_document_id=created_sdoc.id,
                linked_source_document_filename=linked_filename,
            )
            for linked_filename in sdoc_export.links
        ]
        crud_sdoc_link.create_multi(db=db, create_dtos=link_create_dtos)

        # 5. Add embeddings to the vector database
        # Document embeddings
        vector_index.add_embeddings_to_index(
            type=IndexType.DOCUMENT,
            proj_id=project_id,
            sdoc_id=created_sdoc.id,
            embeddings=[np.array(sdoc_export.document_embedding)],
        )

        # Sentence embeddings
        vector_index.add_embeddings_to_index(
            type=IndexType.SENTENCE,
            proj_id=project_id,
            sdoc_id=created_sdoc.id,
            embeddings=[np.array(se) for se in sdoc_export.sentence_embeddings],
        )

        # Image embedding
        if (
            sdoc_export.image_embedding is not None
            and DocType(sdoc_export.doctype) == DocType.image
        ):
            vector_index.add_embeddings_to_index(
                type=IndexType.IMAGE,
                proj_id=project_id,
                sdoc_id=created_sdoc.id,
                embeddings=[np.array(sdoc_export.image_embedding)],
            )

        # 6. Add the source documents to the Elasticsearch index
        elastic_index.add_document_to_index(
            proj_id=project_id,
            esdoc=ElasticSearchDocumentCreate(
                project_id=project_id,
                sdoc_id=created_sdoc.id,
                filename=created_sdoc.filename,
                content=sdoc_export.content,
            ),
        )

    # 7. Resolve the links between the source documents
    crud_sdoc_link.resolve_filenames_to_sdoc_ids(
        db=db,
        proj_id=project_id,
    )

    logger.info(
        f"Successfully imported {len(imported_sdoc_ids)} source documents into project {project_id}"
    )
    return imported_sdoc_ids
