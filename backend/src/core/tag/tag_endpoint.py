from fastapi import Depends
from sqlalchemy.orm import Session

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.doc.source_document_crud import crud_sdoc
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import (
    SourceDocumentTagChangeRequest,
    SourceDocumentTagLinkRequest,
    SourceDocumentTagLinksResult,
    SourceDocumentTagReplaceRequest,
    TagCountRequest,
    TagCreate,
    TagRead,
    TagUpdate,
    TagUpdateBulk,
)
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/tags", tags=["tags", "mcp"])


def _read_sdoc_tag_links(
    db: Session, *, project_id: int, sdoc_ids: list[int]
) -> SourceDocumentTagLinksResult:
    """The tag ids of every given document, an empty list for a document without
    tags (or of another project)."""
    tags = crud_tag.read_tags_for_documents(
        db=db, project_id=project_id, sdoc_ids=sdoc_ids
    )
    return SourceDocumentTagLinksResult(
        project_id=project_id,
        links={
            sdoc_id: [tag.id for tag in tags.get(sdoc_id, [])] for sdoc_id in sdoc_ids
        },
    )


# --- create operations


@router.put(
    "",
    response_model=TagRead,
    summary="Creates a new Tag and returns it with the generated ID.",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    tag: TagCreate,
    ws: WebsocketEmitter = Depends(),
) -> TagRead:
    db_obj = crud_tag.create(db=db, project_id=project_id, create_dto=tag)
    result = TagRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.TAG_CREATED, result, project_id=project_id)
    return result


@router.put(
    "/bulk/source-documents",
    response_model=SourceDocumentTagLinksResult,
    summary=(
        "Links the Tags with the SourceDocuments and returns the resulting tags per "
        "document"
    ),
)
def add_source_documents_bulk(
    *,
    db: DBSession,
    project_id: int,
    multi_link: SourceDocumentTagLinkRequest,
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentTagLinksResult:
    crud_tag.link_multi(
        db=db,
        project_id=project_id,
        sdoc_ids=multi_link.source_document_ids,
        tag_ids=multi_link.tag_ids,
    )
    result = _read_sdoc_tag_links(
        db, project_id=project_id, sdoc_ids=multi_link.source_document_ids
    )
    if result.links:
        ws.emit_to_project(DATSEvent.SDOC_TAGS_LINKED, result, project_id=project_id)
    return result


# --- read operations


@router.get(
    "",
    response_model=list[TagRead],
    summary="Returns the Tags of the Project, optionally only those of the SourceDocument",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
    sdoc_id: int | None = None,
) -> list[TagRead]:
    db_objs = crud_tag.read_by_project(db=db, project_id=project_id, sdoc_id=sdoc_id)
    return [TagRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{tag_id}",
    response_model=TagRead,
    summary="Returns the Tag with the given ID.",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    tag_id: int,
) -> TagRead:
    db_obj = crud_tag.read(db=db, project_id=project_id, id=tag_id)
    return TagRead.model_validate(db_obj)


@router.get(
    "/{tag_id}/source-documents",
    response_model=list[int],
    summary="Returns the IDs of the SourceDocuments linked with the Tag.",
)
def get_source_documents(
    *,
    db: DBSession,
    project_id: int,
    tag_id: int,
) -> list[int]:
    crud_tag.exists(db=db, project_id=project_id, id=tag_id, raise_error=True)
    return [
        sdoc.id
        for sdoc in crud_sdoc.read_by_tags(
            db=db, project_id=project_id, tag_ids=[tag_id]
        )
    ]


# --- update operations


@router.patch(
    "/bulk",
    response_model=list[TagRead],
    summary="Updates the Tags with the given IDs.",
)
def update_bulk(
    *,
    db: DBSession,
    project_id: int,
    tags: list[TagUpdateBulk],
    ws: WebsocketEmitter = Depends(),
) -> list[TagRead]:
    db_objs = crud_tag.update_multi(
        db=db,
        project_id=project_id,
        ids=[t.tag_id for t in tags],
        update_dtos=[
            TagUpdate.model_validate(
                t.model_dump(exclude_unset=True, exclude={"tag_id"})
            )
            for t in tags
        ],
    )
    results = [TagRead.model_validate(db_obj) for db_obj in db_objs]
    if results:
        ws.emit_to_project(DATSEvent.TAG_UPDATED_BATCH, results, project_id=project_id)
    return results


@router.patch(
    "/bulk/source-documents",
    response_model=SourceDocumentTagLinksResult,
    summary=(
        "Links and unlinks Tags of the SourceDocuments and returns the resulting tags "
        "per document"
    ),
)
def update_source_documents_bulk(
    *,
    db: DBSession,
    project_id: int,
    links: SourceDocumentTagChangeRequest,
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentTagLinksResult:
    crud_tag.link_multi(
        db=db,
        project_id=project_id,
        sdoc_ids=links.source_document_ids,
        tag_ids=links.link_tag_ids,
    )
    crud_tag.unlink_multi(
        db=db,
        project_id=project_id,
        sdoc_ids=links.source_document_ids,
        tag_ids=links.unlink_tag_ids,
    )
    result = _read_sdoc_tag_links(
        db, project_id=project_id, sdoc_ids=links.source_document_ids
    )
    if result.links:
        ws.emit_to_project(DATSEvent.SDOC_TAGS_LINKED, result, project_id=project_id)
    return result


@router.patch(
    "/bulk/source-documents/replace",
    response_model=SourceDocumentTagLinksResult,
    summary=(
        "Sets the Tags of each SourceDocument to the given Tags and returns the "
        "resulting tags per document"
    ),
)
def replace_source_documents_bulk(
    *,
    db: DBSession,
    project_id: int,
    links: SourceDocumentTagReplaceRequest,
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentTagLinksResult:
    crud_tag.set_tags_multi(db=db, project_id=project_id, links=links.links)
    result = _read_sdoc_tag_links(db, project_id=project_id, sdoc_ids=list(links.links))
    if result.links:
        ws.emit_to_project(DATSEvent.SDOC_TAGS_LINKED, result, project_id=project_id)
    return result


@router.patch(
    "/{tag_id}",
    response_model=TagRead,
    summary="Updates the Tag with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    tag_id: int,
    tag: TagUpdate,
    ws: WebsocketEmitter = Depends(),
) -> TagRead:
    db_obj = crud_tag.update(db=db, project_id=project_id, id=tag_id, update_dto=tag)
    result = TagRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.TAG_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/bulk/source-documents",
    response_model=SourceDocumentTagLinksResult,
    summary=(
        "Unlinks the Tags from the SourceDocuments and returns the resulting tags per "
        "document"
    ),
)
def remove_source_documents_bulk(
    *,
    db: DBSession,
    project_id: int,
    multi_link: SourceDocumentTagLinkRequest,
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentTagLinksResult:
    crud_tag.unlink_multi(
        db=db,
        project_id=project_id,
        sdoc_ids=multi_link.source_document_ids,
        tag_ids=multi_link.tag_ids,
    )
    result = _read_sdoc_tag_links(
        db, project_id=project_id, sdoc_ids=multi_link.source_document_ids
    )
    if result.links:
        ws.emit_to_project(DATSEvent.SDOC_TAGS_LINKED, result, project_id=project_id)
    return result


@router.delete(
    "/{tag_id}",
    response_model=TagRead,
    summary="Deletes the Tag with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    tag_id: int,
    ws: WebsocketEmitter = Depends(),
) -> TagRead:
    db_obj = crud_tag.read(db=db, project_id=project_id, id=tag_id)
    result = TagRead.model_validate(db_obj)
    crud_tag.delete(db=db, project_id=project_id, id=tag_id)
    ws.emit_to_project(DATSEvent.TAG_DELETED, result, project_id=project_id)
    return result


# --- other operations


@router.post(
    "/counts",
    response_model=dict[int, int],
    summary=(
        "Counts per Tag how many of the SourceDocuments carry it, for the given Tags "
        "or all Tags of the Project"
    ),
)
def count(
    *,
    db: DBSession,
    project_id: int,
    request: TagCountRequest,
) -> dict[int, int]:
    return crud_tag.count_by_sdocs(
        db=db,
        project_id=project_id,
        sdoc_ids=request.sdoc_ids,
        tag_ids=request.tag_ids,
    )
