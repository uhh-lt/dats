from typing import Any, Dict, List, Optional

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataReadResolved,
)
from app.core.data.orm.document_tag import DocumentTagORM


def get_sdocs_metadata_for_export(
    db: Session,
    sdoc_ids: Optional[List[int]] = None,
    sdocs: Optional[List[SourceDocumentRead]] = None,
) -> List[Dict[str, Any]]:
    if sdoc_ids is None:
        if sdocs is None:
            raise ValueError("Either IDs or DTOs must be not None")
        sdoc_ids = list(map(lambda sdoc: sdoc.id, sdocs))

    sdoc_orms = crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)

    if sdocs is None:
        sdocs = [SourceDocumentRead.model_validate(sdoc) for sdoc in sdoc_orms]

    sdoc_tags: Dict[int, List[DocumentTagORM]] = {sdoc.id: [] for sdoc in sdocs}
    for sdoc_orm in sdoc_orms:
        for tag in sdoc_orm.document_tags:
            sdoc_tags[sdoc_orm.id].append(tag)

    exported_sdocs_metadata = []

    for sdoc in sdocs:
        sdoc_metadatas = crud_sdoc_meta.read_by_sdoc(db=db, sdoc_id=sdoc.id)
        logger.info(f"export sdoc tags: {sdoc_tags[sdoc.id]} for {sdoc.filename}")
        sdoc_metadata_dtos = [
            SourceDocumentMetadataReadResolved.model_validate(sdoc_metadata)
            for sdoc_metadata in sdoc_metadatas
        ]
        metadata_dict = dict()
        for metadata in sdoc_metadata_dtos:
            metadata_dict[metadata.project_metadata.key] = {
                "value": metadata.get_value_serializable(),
            }
        exported_sdocs_metadata.append(
            {
                "name": sdoc.name if sdoc.name else "",
                "filename": sdoc.filename,
                "doctype": sdoc.doctype,
                "metadata": metadata_dict,
                "tags": [tag.name for tag in sdoc_tags[sdoc.id]],
            }
        )

    return exported_sdocs_metadata


def get_all_sdoc_metadatas_in_project_for_export(
    db: Session, project_id: int
) -> List[Dict[str, Any]]:
    sdocs = [
        SourceDocumentRead.model_validate(sdoc)
        for sdoc in crud_sdoc.read_by_project(db=db, proj_id=project_id)
    ]
    exported_sdocs_metadata = get_sdocs_metadata_for_export(db=db, sdocs=sdocs)
    return exported_sdocs_metadata
