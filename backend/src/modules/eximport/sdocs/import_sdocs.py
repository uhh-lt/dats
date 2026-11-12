from pathlib import Path

from loguru import logger
from sqlalchemy.orm import Session

from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate
from core.doc.folder_enum import FolderType
from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.image_embedding_dto import ImageObjectIdentifier
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.sdoc_elastic_dto import ElasticSearchDocumentCreate
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataCreate
from core.doc.source_document_dto import SourceDocumentCreate, SourceDocumentRead
from core.doc.source_document_step_status_crud import crud_sdoc_step_status
from core.doc.source_document_step_status_dto import SourceDocumentStepStatusCreate
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import SourceDocumentMetadataCreate
from core.project.project_crud import crud_project
from core.tag.tag_crud import crud_tag
from modules.doc_processing.image.image_thumbnail_generation_job import (
    generate_thumbnails,
)
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.video.video_audio_extraction_job import (
    extract_audio_stream,
)
from modules.doc_processing.video.video_thumbnail_generation_job import (
    store_video_thumbnail,
)
from modules.eximport.import_csv_utils import read_import_csv
from modules.eximport.import_exceptions import ImportSourceDocumentsError
from modules.eximport.sdocs.sdoc_export_schema import (
    SourceDocumentExportCollection,
    SourceDocumentExportSchema,
)
from modules.word_frequency.word_frequency_crud import crud_word_frequency
from modules.word_frequency.word_frequency_dto import WordFrequencyCreate
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo

es = ElasticSearchRepo()
fsr = FilesystemRepo()


def archived_step_status(
    sdoc_export: SourceDocumentExportSchema,
) -> dict[str, int | None]:
    """The status of each pipeline step of the document's doctype, as in the
    archive (None = not planned). Archives exported before the feature toggles
    hold one status per document: every step of the doctype gets it.

    A step that was processing when the archive was exported is not planned: the
    import starts no job, so it would stay processing forever. An embedding step
    whose embeddings are missing in the archive is not planned either, whatever
    its status; so is the sentence embedding of a document whose archive does not
    hold one embedding per sentence. The import plans no step: a feature whose steps are not planned
    is partly available until a user completes it."""
    graph = pipeline_registry.graph()
    doctype = DocType(sdoc_export.doctype)
    steps = graph.steps(doctype)
    archived = sdoc_export.step_status
    step_status: dict[str, int | None] = {
        step.value: sdoc_export.status if archived is None else archived.get(step.value)
        for step in steps
    }
    for step, status in step_status.items():
        if status == SDocStatus.processing.value:
            step_status[step] = None

    missing = {
        Artefact.DOCUMENT_EMBEDDINGS: sdoc_export.document_embedding is None,
        # archives of older versions hold only the first 25 embeddings
        Artefact.SENTENCE_EMBEDDINGS: len(sdoc_export.sentence_embeddings)
        != len(sdoc_export.sentence_starts),
        Artefact.IMAGE_EMBEDDINGS: sdoc_export.image_embedding is None,
    }
    for artefact, is_missing in missing.items():
        step = graph.producer(doctype, artefact)
        if is_missing and step is not None:
            step_status[step.value] = None
    return step_status


def import_sdocs_to_proj(
    db: Session,
    path_to_dir: Path,
    project_id: int,
) -> list[int]:
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

    df = read_import_csv(data_file)

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
    source_file_by_name: dict[str, Path] = {}
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
            db=db, project_id=project_id, filename=sdoc.filename, only_finished=False
        )
        if existing_sdoc is not None:
            error_messages.append(
                f"Source document with filename '{sdoc.filename}' already exists in project {project_id}"
            )

    # 3. Check if all tags exist
    needed_tags: set[str] = set()
    for sdoc in sdoc_collection.source_documents:
        needed_tags.update(sdoc.tags)
    existing_tags = {tag.name: tag for tag in project.tags}
    for tag_name in needed_tags:
        if tag_name not in existing_tags:
            error_messages.append(
                f"Tag '{tag_name}' does not exist in project {project_id}"
            )

    # 4.1 Check if all parent folders exist
    needed_parent_folders: set[str] = set()
    for sdoc in sdoc_collection.source_documents:
        if sdoc.folder_parent_name:
            needed_parent_folders.add(sdoc.folder_parent_name)
    existing_folders = {
        folder.name
        for folder in project.folders
        if folder.folder_type == FolderType.NORMAL
    }
    for folder_name in needed_parent_folders:
        if folder_name not in existing_folders:
            error_messages.append(
                f"Parent folder '{folder_name}' does not exist in project {project_id}"
            )

    # 4.2 Check sdoc folders
    sdoc_folder_names: set[str] = set()
    for sdoc in sdoc_collection.source_documents:
        sdoc_folder_names.add(sdoc.folder_name)
    for sdoc_folder_name in sdoc_folder_names:
        existing_folder = crud_folder.read_by_name_and_project(
            db=db, folder_name=sdoc_folder_name, project_id=project_id
        )
        if (
            existing_folder is not None
            and existing_folder.folder_type != FolderType.NORMAL
        ):
            error_messages.append(
                f"Folder '{sdoc_folder_name}' is not a normal folder in project {project_id}"
            )

    # 5. Check if all metadata keys exist
    needed_metadata_keys: dict[DocType, set[str]] = {}
    for sdoc in sdoc_collection.source_documents:
        for key, _ in sdoc.metadata:
            if DocType(sdoc.doctype) not in needed_metadata_keys:
                needed_metadata_keys[DocType(sdoc.doctype)] = set()
            needed_metadata_keys[DocType(sdoc.doctype)].add(key)
    existing_metadata: dict[tuple[DocType, str], ProjectMetadataORM] = {}
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
        repo_path = fsr.move_file_to_project_sdoc_files(
            project_id=project_id, src_file=source_file
        )
        relative_url = str(repo_path.relative_to(fsr.root_dir))
        # generate thumbnail if needed
        if DocType(sdoc_export.doctype) == DocType.image:
            generate_thumbnails(repo_path)

        # 2.1 Create the sdoc folder (if it does not already exist)
        sdoc_folder = crud_folder.read_by_name_and_project(
            db=db, folder_name=sdoc_export.folder_name, project_id=project_id
        )
        if sdoc_folder is None:
            sdoc_folder = crud_folder.create(
                db=db,
                create_dto=FolderCreate(
                    name=sdoc_export.folder_name,
                    project_id=project_id,
                    folder_type=FolderType.SDOC_FOLDER,
                ),
            )

        # 2.2 Create the source documents in the database
        sdoc_create = SourceDocumentCreate(
            filename=sdoc_export.filename,
            name=sdoc_export.name or sdoc_export.filename,
            doctype=DocType(sdoc_export.doctype),
            project_id=project_id,
            folder_id=sdoc_folder.id,
        )

        # 2.3 Set the status of the steps from the archive
        step_status = archived_step_status(sdoc_export)

        created_sdoc = crud_sdoc.create(db=db, create_dto=sdoc_create)
        crud_sdoc_step_status.create_multi(
            db=db,
            create_dtos=[
                SourceDocumentStepStatusCreate(
                    sdoc_id=created_sdoc.id,
                    step=JobType(step),
                    status=SDocStatus(status),
                )
                for step, status in step_status.items()
                if status is not None
            ],
        )
        imported_sdoc_ids.append(created_sdoc.id)
        filename_to_id_map[created_sdoc.filename] = created_sdoc.id

        # 3. Create the source document data in the database
        sdoc_data_create = SourceDocumentDataCreate(
            id=created_sdoc.id,
            repo_url=relative_url,
            content=sdoc_export.content if sdoc_export.content else "",
            html=sdoc_export.html,
            raw_html=sdoc_export.raw_html,
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
        crud_tag.link_multiple_tags(db=db, sdoc_ids=[created_sdoc.id], tag_ids=tag_ids)

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

        # 5. Add embeddings to the vector database
        client = WeaviateRepo().get_client()
        # Document embeddings
        if sdoc_export.document_embedding is not None:
            crud_document_embedding.create(
                client=client,
                project_id=project_id,
                id=DocumentObjectIdentifier(sdoc_id=created_sdoc.id),
                embedding=sdoc_export.document_embedding,
            )

        # Sentence embeddings (only one per sentence: partial ones are missing)
        if len(sdoc_export.sentence_embeddings) > 0 and len(
            sdoc_export.sentence_embeddings
        ) == len(sdoc_export.sentence_starts):
            crud_sentence_embedding.create_multi(
                client=client,
                project_id=project_id,
                ids=[
                    SentenceObjectIdentifier(sdoc_id=created_sdoc.id, sentence_id=i)
                    for i in range(len(sdoc_export.sentence_embeddings))
                ],
                embeddings=[se for se in sdoc_export.sentence_embeddings],
            )

        # Image embedding
        if (
            sdoc_export.image_embedding is not None
            and DocType(sdoc_export.doctype) == DocType.image
        ):
            crud_image_embedding.create(
                client=client,
                project_id=project_id,
                id=ImageObjectIdentifier(sdoc_id=created_sdoc.id),
                embedding=sdoc_export.image_embedding,
            )

        # 6. Add the source documents to the Elasticsearch index (if it was
        # indexed: the entry is computed from the content and the filename only)
        es_index_step = pipeline_registry.graph().producer(
            DocType(sdoc_export.doctype), Artefact.ES_INDEX
        )
        if (
            es_index_step is not None
            and step_status.get(es_index_step.value) == SDocStatus.finished
        ):
            crud_sdoc_elastic.create(
                client=ElasticSearchRepo().get_client(),
                project_id=project_id,
                create_dto=ElasticSearchDocumentCreate(
                    project_id=project_id,
                    sdoc_id=created_sdoc.id,
                    filename=created_sdoc.filename,
                    content=sdoc_export.content if sdoc_export.content else "",
                ),
            )

        # 7. Extract the audio stream of a video again (if it was extracted): the
        # archive holds only the uploaded file
        audio_step = pipeline_registry.graph().producer(
            DocType(sdoc_export.doctype), Artefact.AUDIO
        )
        if (
            audio_step is not None
            and step_status.get(audio_step.value) == SDocStatus.finished
        ):
            extract_audio_stream(repo_path)

        # 8. Write the thumbnail of a video again (if it was written): the archive
        # holds only the uploaded file
        thumbnail_step = pipeline_registry.graph().producer(
            DocType(sdoc_export.doctype), Artefact.THUMBNAIL
        )
        if (
            DocType(sdoc_export.doctype) == DocType.video
            and thumbnail_step is not None
            and step_status.get(thumbnail_step.value) == SDocStatus.finished
        ):
            store_video_thumbnail(
                db=db,
                sdoc=SourceDocumentRead.model_validate(created_sdoc),
                video_path=repo_path,
            )

    logger.info(
        f"Successfully imported {len(imported_sdoc_ids)} source documents into project {project_id}"
    )
    return imported_sdoc_ids
