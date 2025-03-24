from pathlib import Path
from typing import List

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataReadResolved,
)
from app.core.data.export.no_data_export_error import NoDataToExportError
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService


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

    # We export 3 things for each source document:
    # 1. The source document itself (the raw file)
    # 2. The source document's metadata (json file)
    # 3. (if available) The source document's transcript (json file)
    sdoc_files = [
        repo.get_path_to_sdoc_file(
            SourceDocumentRead.model_validate(sdoc), raise_if_not_exists=True
        )
        for sdoc in sdocs
    ]
    metadata_files = __generate_metadata_export_jsons_for_sdocs(
        repo=repo,
        sdocs=sdocs,
    )
    transcript_files = __generate_transcript_export_jsons_for_sdocs(
        repo=repo,
        sdocs=sdocs,
    )

    return repo.write_files_to_temp_zip_file(
        files=sdoc_files + metadata_files + transcript_files, fn=fn
    )


def __generate_metadata_export_jsons_for_sdocs(
    repo: RepoService,
    sdocs: List[SourceDocumentORM],
) -> List[Path]:
    logger.info(f"Exporting {len(sdocs)} Sdoc Metadata ...")

    # Metadata inlcudes:
    # 1. Info about the source document (name, filename, doctype)
    # 2. The source document's metadata (sdoc metadata)
    # 3. The source document's tags (sdoc tags)
    # 4. The source document's links (sdoc links)

    files = []
    for sdoc in sdocs:
        # Sdoc Metadata
        sdoc_metadata_dtos = [
            SourceDocumentMetadataReadResolved.model_validate(sdoc_metadata)
            for sdoc_metadata in sdoc.metadata_
        ]
        metadata_dict = dict()
        for metadata in sdoc_metadata_dtos:
            metadata_dict[metadata.project_metadata.key] = (
                metadata.get_value_serializable()
            )

        # Sdoc Tags
        tags = [tag.name for tag in sdoc.document_tags]

        # Sdoc Links
        links = [
            link.linked_source_document_filename for link in sdoc.source_document_links
        ]

        # Sdoc Info
        data = {
            "name": sdoc.name if sdoc.name else "",
            "filename": sdoc.filename,
            "doctype": sdoc.doctype,
            "metadata": metadata_dict,
            "tags": tags,
            "links": links,
        }

        # Write to file
        files.append(
            repo.write_json_to_temp_file(
                json_obj=data,
                fn=f"{sdoc.filename}.metadata",
            )
        )
    return files


def __generate_transcript_export_jsons_for_sdocs(
    repo: RepoService, sdocs: List[SourceDocumentORM]
) -> List[Path]:
    logger.info(f"Trying to export {len(sdocs)} sdoc transcripts ...")

    files = []
    for sdoc in sdocs:
        word_level_transcriptions = sdoc.data.word_level_transcriptions
        if word_level_transcriptions is None:
            continue

        # Write to file
        data = [wlt.model_dump() for wlt in word_level_transcriptions]
        files.append(
            repo.write_json_to_temp_file(
                json_obj=data,
                fn=f"{sdoc.filename}.transcript",
            )
        )

    return files
