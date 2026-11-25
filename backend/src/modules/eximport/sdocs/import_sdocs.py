from pathlib import Path

from loguru import logger
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate
from core.doc.folder_enum import FolderType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataCreate
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_file_crud import crud_sdoc_file
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import SourceDocumentMetadataCreate
from core.project.project_crud import crud_project
from core.tag.tag_crud import crud_tag
from modules.eximport.import_csv_utils import read_import_csv
from modules.eximport.import_exceptions import ImportSourceDocumentsError
from modules.eximport.sdocs.sdoc_export_schema import (
    SourceDocumentExportCollection,
    SourceDocumentExportSchema,
)
from repos.elastic.elastic_repo import ElasticSearchRepo
from systems.artefact_system.artefact_registry import artefact_registry
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)
from systems.artefact_system.source_document_step_status_dto import (
    SourceDocumentStepStatusCreate,
)

# archives of versions before the feature toggles hold one status per document
ARCHIVE_WITHOUT_STEP_STATUS = (
    "The archive was exported by a version of DATS before the feature toggles "
    "(it holds no status per processing step) and cannot be imported."
)

es = ElasticSearchRepo()


def archived_step_status(
    sdoc_export: SourceDocumentExportSchema,
) -> dict[str, int | None]:
    """The status of each pipeline step of the document's doctype, as in the
    archive (None = not planned).

    A step that was processing when the archive was exported is not planned: the
    import starts no job, so it would stay processing forever. A step whose
    artefact the archive does not hold completely (its archive says so) is
    not planned either, whatever its status. The import plans no step: a feature
    whose steps are not planned is partly available until a user completes it,
    and a core step that is not planned (e.g. the search index) is planned by
    Recompute in the document health view."""
    graph = artefact_registry.graph()
    doctype = DocType(sdoc_export.doctype)
    steps = graph.steps(doctype)
    step_status: dict[str, int | None] = {
        step: sdoc_export.step_status.get(step) for step in steps
    }
    for step, status in step_status.items():
        if status == SDocStatus.processing.value:
            step_status[step] = None

    archived = sdoc_export.model_dump()
    for artefact, archive in artefact_registry.archives():
        step = graph.producer(doctype, artefact)
        if step is not None and not archive.is_complete(archived):
            step_status[step] = None
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
    if "step_status" not in df.columns:
        raise ImportSourceDocumentsError(errors=[ARCHIVE_WITHOUT_STEP_STATUS])

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
        # 1.1 Create the sdoc folder (if it does not already exist)
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

        # 1.2 Create the source documents in the database
        sdoc_create = SourceDocumentCreate(
            filename=sdoc_export.filename,
            name=sdoc_export.name or sdoc_export.filename,
            doctype=DocType(sdoc_export.doctype),
            project_id=project_id,
            folder_id=sdoc_folder.id,
        )

        # 1.3 Set the status of the steps from the archive
        step_status = archived_step_status(sdoc_export)

        created_sdoc = crud_sdoc.create(db=db, create_dto=sdoc_create)
        crud_sdoc_step_status.create_multi(
            db=db,
            create_dtos=[
                SourceDocumentStepStatusCreate(
                    project_id=created_sdoc.project_id,
                    sdoc_id=created_sdoc.id,
                    step=step,
                    status=SDocStatus(status),
                )
                for step, status in step_status.items()
                if status is not None
            ],
        )
        imported_sdoc_ids.append(created_sdoc.id)
        filename_to_id_map[created_sdoc.filename] = created_sdoc.id

        # 2. Move the source file into the document's folder
        crud_sdoc_file.move_in(
            project_id=project_id,
            id=created_sdoc.id,
            src=source_file_by_name[sdoc_export.filename],
        )

        # 3. Create the source document data in the database
        sdoc_data_create = SourceDocumentDataCreate(
            id=created_sdoc.id,
            project_id=created_sdoc.project_id,
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

        # 4. Link the source documents with the attached data (tags, metadata)
        # Tags
        tag_ids = [existing_tags[tag_name].id for tag_name in sdoc_export.tags]
        crud_tag.link_multiple_tags(db=db, sdoc_ids=[created_sdoc.id], tag_ids=tag_ids)

        # Metadata
        metadata_create_dtos = []
        for key, value in sdoc_export.metadata:
            # Find project metadata to get the ID
            project_metadata = existing_metadata[(DocType(sdoc_export.doctype), key)]

            metadata_create = SourceDocumentMetadataCreate.with_metatype(
                project_id=created_sdoc.project_id,
                metatype=project_metadata.metatype,
                source_document_id=created_sdoc.id,
                project_metadata_id=project_metadata.id,
                value=value,
            )
            metadata_create_dtos.append(metadata_create)
        crud_sdoc_meta.create_multi(db=db, create_dtos=metadata_create_dtos)

        # 5. Write the artefacts with an archive to their stores, if
        # their step was imported as finished
        graph = artefact_registry.graph()
        archived = sdoc_export.model_dump()
        for artefact, archive in artefact_registry.archives():
            step = graph.producer(DocType(sdoc_export.doctype), artefact)
            if step is not None and step_status.get(step) == SDocStatus.finished:
                archive.write(db=db, sdoc=created_sdoc, archived=archived)

    logger.info(
        f"Successfully imported {len(imported_sdoc_ids)} source documents into project {project_id}"
    )
    return imported_sdoc_ids
