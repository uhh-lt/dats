from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.auth.validation import Validate
from core.doc.source_document_crud import crud_sdoc
from core.project.project_crud import crud_project
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import (
    SdocTagLinks,
    SourceDocumentTagMultiLink,
    TagCreate,
    TagRead,
    TagUpdate,
)
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/tag", dependencies=[Depends(get_current_user)], tags=["tag", "mcp"]
)


# --- create operations


@router.put(
    "",
    response_model=TagRead,
    summary="Creates a new Tag and returns it with the generated ID.",
)
def create_doc_tag(
    *,
    db: Session = Depends(get_db_session),
    tag: TagCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> TagRead:
    authz_user.assert_in_project(tag.project_id)

    if tag.parent_id is not None:
        authz_user.assert_in_same_project_as(Crud.TAG, tag.parent_id)

        parent_tag = crud_tag.read(db, tag.parent_id)
        validate.validate_condition(
            parent_tag.project_id == tag.project_id,
            "Parent tag needs to be in the same project",
        )

    db_obj = crud_tag.create(db=db, create_dto=tag)
    result = TagRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.TAG_CREATED, result, project_id=tag.project_id)
    return result


# --- read operations


@router.get(
    "/{tag_id}",
    response_model=TagRead,
    summary="Returns the Tag with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    tag_id: int,
    authz_user: AuthzUser = Depends(),
) -> TagRead:
    authz_user.assert_in_same_project_as(Crud.TAG, tag_id)

    db_obj = crud_tag.read(db=db, id=tag_id)
    return TagRead.model_validate(db_obj)


@router.get(
    "/project/{proj_id}",
    response_model=list[TagRead],
    summary="Returns all Tags of the Project with the given ID",
)
def get_by_project(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[TagRead]:
    authz_user.assert_in_project(proj_id)

    proj_db_obj = crud_project.read(db=db, id=proj_id)
    return [TagRead.model_validate(tag) for tag in proj_db_obj.tags]


@router.get(
    "/sdoc/{sdoc_id}",
    response_model=list[int],
    summary="Returns all TagIDs linked with the SourceDocument.",
)
def get_by_sdoc(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[int]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [doc_tag_db_obj.id for doc_tag_db_obj in sdoc_db_obj.tags]


@router.get(
    "/{tag_id}/sdocs",
    response_model=list[int],
    summary=(
        "Returns all SourceDocument IDs attached to the Tag with the given ID if it exists."
    ),
)
def get_sdoc_ids_by_tag_id(
    *,
    db: Session = Depends(get_db_session),
    tag_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[int]:
    authz_user.assert_in_same_project_as(Crud.TAG, tag_id)

    db_obj = crud_tag.read(db=db, id=tag_id)
    return [sdoc.id for sdoc in db_obj.source_documents]


# --- update operations


@router.patch(
    "/{tag_id}",
    response_model=TagRead,
    summary="Updates the Tag with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    tag_id: int,
    tag: TagUpdate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> TagRead:
    authz_user.assert_in_same_project_as(Crud.TAG, tag_id)

    db_obj = crud_tag.update(db=db, id=tag_id, update_dto=tag)
    result = TagRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.TAG_UPDATED, result, project_id=db_obj.get_project_id()
    )
    return result


@router.patch(
    "/bulk/link",
    response_model=SdocTagLinks,
    summary="Links multiple Tags with the SourceDocuments and returns the resulting tags per document",
)
def link_multiple_tags(
    *,
    db: Session = Depends(get_db_session),
    multi_link: SourceDocumentTagMultiLink,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SdocTagLinks:
    authz_user.assert_in_same_project_as_many(
        Crud.SOURCE_DOCUMENT, multi_link.source_document_ids
    )
    authz_user.assert_in_same_project_as_many(Crud.TAG, multi_link.tag_ids)

    validate.validate_objects_in_same_project(
        [(Crud.SOURCE_DOCUMENT, sdoc_id) for sdoc_id in multi_link.source_document_ids]
        + [(Crud.TAG, tag_id) for tag_id in multi_link.tag_ids]
    )

    crud_tag.link_multiple_tags(
        db=db,
        sdoc_ids=multi_link.source_document_ids,
        tag_ids=multi_link.tag_ids,
    )

    result = SdocTagLinks(
        links=crud_sdoc.read_tags(db=db, sdoc_ids=multi_link.source_document_ids)
    )
    project_id = crud_sdoc.read(db=db, id=multi_link.source_document_ids[0]).project_id
    ws.emit_to_project(DATSEvent.SDOC_TAGS_LINKED, result, project_id=project_id)
    return result


@router.patch(
    "/bulk/set",
    response_model=SdocTagLinks,
    summary="Sets SourceDocuments' tags to the provided tags and returns the resulting tags per document",
)
def set_tags_batch(
    *,
    db: Session = Depends(get_db_session),
    links: SdocTagLinks,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SdocTagLinks:
    sdoc_ids = list(links.links.keys())
    tag_ids = list({tag_id for ids in links.links.values() for tag_id in ids})
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)
    authz_user.assert_in_same_project_as_many(Crud.TAG, tag_ids)

    validate.validate_objects_in_same_project(
        [(Crud.SOURCE_DOCUMENT, sdoc_id) for sdoc_id in sdoc_ids]
        + [(Crud.TAG, tag_id) for tag_id in tag_ids]
    )

    crud_tag.set_tags_batch(db=db, links=links.links)

    result = SdocTagLinks(links=crud_sdoc.read_tags(db=db, sdoc_ids=sdoc_ids))
    project_id = crud_sdoc.read(db=db, id=sdoc_ids[0]).project_id
    ws.emit_to_project(DATSEvent.SDOC_TAGS_LINKED, result, project_id=project_id)
    return result


@router.patch(
    "/bulk/update",
    response_model=SdocTagLinks,
    summary="Updates SourceDocuments' tags and returns the resulting tags per document",
)
def update_tags_batch(
    *,
    db: Session = Depends(get_db_session),
    sdoc_ids: list[int],
    unlink_tag_ids: list[int],
    link_tag_ids: list[int],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SdocTagLinks:
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)
    authz_user.assert_in_same_project_as_many(Crud.TAG, link_tag_ids)

    validate.validate_objects_in_same_project(
        [(Crud.SOURCE_DOCUMENT, sdoc_id) for sdoc_id in sdoc_ids]
        + [(Crud.TAG, tag_id) for tag_id in link_tag_ids]
    )

    crud_tag.link_multiple_tags(
        db=db,
        sdoc_ids=sdoc_ids,
        tag_ids=link_tag_ids,
    )
    crud_tag.unlink_multiple_tags(
        db=db,
        sdoc_ids=sdoc_ids,
        tag_ids=unlink_tag_ids,
    )

    result = SdocTagLinks(links=crud_sdoc.read_tags(db=db, sdoc_ids=sdoc_ids))
    project_id = crud_sdoc.read(db=db, id=sdoc_ids[0]).project_id
    ws.emit_to_project(DATSEvent.SDOC_TAGS_LINKED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/{tag_id}",
    response_model=TagRead,
    summary="Deletes the Tag with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    tag_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> TagRead:
    authz_user.assert_in_same_project_as(Crud.TAG, tag_id)

    db_obj = crud_tag.read(db=db, id=tag_id)
    tag_read = TagRead.model_validate(db_obj)

    crud_tag.delete(db=db, id=tag_id)
    ws.emit_to_project(
        DATSEvent.TAG_DELETED, tag_read, project_id=db_obj.get_project_id()
    )
    return tag_read


@router.delete(
    "/bulk/unlink",
    response_model=SdocTagLinks,
    summary="Unlinks all Tags with the SourceDocuments and returns the resulting tags per document",
)
def unlink_multiple_tags(
    *,
    db: Session = Depends(get_db_session),
    multi_link: SourceDocumentTagMultiLink,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SdocTagLinks:
    authz_user.assert_in_same_project_as_many(
        Crud.SOURCE_DOCUMENT, multi_link.source_document_ids
    )
    authz_user.assert_in_same_project_as_many(Crud.TAG, multi_link.tag_ids)

    validate.validate_objects_in_same_project(
        [(Crud.SOURCE_DOCUMENT, sdoc_id) for sdoc_id in multi_link.source_document_ids]
        + [(Crud.TAG, tag_id) for tag_id in multi_link.tag_ids]
    )

    crud_tag.unlink_multiple_tags(
        db=db,
        sdoc_ids=multi_link.source_document_ids,
        tag_ids=multi_link.tag_ids,
    )

    result = SdocTagLinks(
        links=crud_sdoc.read_tags(db=db, sdoc_ids=multi_link.source_document_ids)
    )
    project_id = crud_sdoc.read(db=db, id=multi_link.source_document_ids[0]).project_id
    ws.emit_to_project(DATSEvent.SDOC_TAGS_LINKED, result, project_id=project_id)
    return result


# --- other operations


@router.post(
    "/sdoc_counts/{project_id}",
    response_model=dict[int, int],
    summary="Returns a dict of all tag ids with their count of assigned source documents, counting only source documents in the given id list",
)
def get_sdoc_counts(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    sdoc_ids: list[int],
    authz_user: AuthzUser = Depends(),
) -> dict[int, int]:
    authz_user.assert_in_project(project_id)
    return crud_tag.read_tag_sdoc_counts(db, project_id=project_id, sdoc_ids=sdoc_ids)


@router.post(
    "/count_tags/{user_id}",
    response_model=dict[int, int],
    summary="Counts the Tags of the User (by user_id) per Tags (by class_ids) in Documents (by sdoc_ids)",
)
def count_tags(
    *,
    db: Session = Depends(get_db_session),
    user_id: int,
    sdoc_ids: list[int],
    class_ids: list[int],
    authz_user: AuthzUser = Depends(),
) -> dict[int, int]:
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)

    # TODO: users are not associated with tags...
    return crud_tag.count_by_tags_and_sdocs_and_user(
        db=db, tag_ids=class_ids, sdoc_ids=sdoc_ids, user_id=user_id
    )
