from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataRead
from core.doc.source_document_dto import SourceDocumentRead, SourceDocumentUpdate
from repos.filesystem_repo import FilesystemRepo
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/sdoc",
    dependencies=[Depends(get_current_user)],
    tags=["sourceDocument", "mcp"],
)


# --- read operations


@router.get(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Returns the SourceDocument with the given ID if it exists",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_if_finished: bool = True,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    if not only_if_finished:
        crud_sdoc.read_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)

    return SourceDocumentRead.model_validate(crud_sdoc.read(db=db, id=sdoc_id))


@router.get(
    "/data/{sdoc_id}",
    response_model=SourceDocumentDataRead,
    summary="Returns the SourceDocumentData with the given ID if it exists",
)
def get_by_id_with_data(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_if_finished: bool = True,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentDataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    if not only_if_finished:
        crud_sdoc.read_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)

    sdoc_data = crud_sdoc_data.read(db=db, id=sdoc_id)
    return SourceDocumentDataRead.model_validate(sdoc_data)


@router.get(
    "/{sdoc_id}/same_folder",
    response_model=list[int],
    summary="Returns the ids of SourceDocuments in the same folder as the SourceDocument with the given id.",
)
def get_same_folder_sdocs(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[int]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)
    sdoc = crud_sdoc.read(db=db, id=sdoc_id)
    same_folder_sdocs = sdoc.folder.source_documents
    doctype_order = {"text": 0, "img": 1, "audio": 2, "video": 3}
    same_folder_sdocs.sort(key=lambda s: (doctype_order.get(s.doctype, 99), s.filename))
    return [s.id for s in same_folder_sdocs]


@router.get(
    "/{sdoc_id}/url",
    response_model=str,
    summary="Returns the URL to the original file of the SourceDocument with the given ID if it exists.",
)
def get_file_url(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    relative: bool = True,
    webp: bool = False,
    thumbnail: bool = False,
    authz_user: AuthzUser = Depends(),
) -> str:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    # TODO: FIX TYPING
    return FilesystemRepo().get_sdoc_url(
        sdoc=SourceDocumentRead.model_validate(sdoc_db_obj),
        relative=relative,
        webp=webp,
        thumbnail=thumbnail,
    )


@router.get(
    "/{sdoc_id}/annotators",
    response_model=list[int],
    summary="Returns IDs of users that annotated that SourceDocument.",
)
def get_annotators(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[int]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    return [
        adoc.user_id for adoc in crud_sdoc.read(db=db, id=sdoc_id).annotation_documents
    ]


# --- update operations


@router.patch(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Updates the SourceDocument with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    sdoc: SourceDocumentUpdate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_obj = crud_sdoc.update(db=db, id=sdoc_id, update_dto=sdoc)
    result = SourceDocumentRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.SDOC_UPDATED, result, project_id=db_obj.get_project_id()
    )
    return result


# --- delete operations


@router.delete(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Removes the SourceDocument with the given ID if it exists",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_obj = crud_sdoc.delete(db=db, id=sdoc_id)
    result = SourceDocumentRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.SDOC_DELETED, result, project_id=db_obj.get_project_id()
    )
    return result


@router.delete(
    "/bulk/delete",
    response_model=list[SourceDocumentRead],
    summary="Removes all SourceDocuments with the given IDs if they exist",
)
def delete_sdocs_bulk(
    *,
    db: Session = Depends(get_db_session),
    sdoc_ids: list[int],
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[SourceDocumentRead]:
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)

    sdocs = crud_sdoc.read_by_ids(db, sdoc_ids)
    project_ids = {sdoc.project_id for sdoc in sdocs}
    if len(project_ids) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All SourceDocuments must belong to the same project",
        )

    db_objs = crud_sdoc.delete_bulk(db=db, ids=sdoc_ids)
    results = [SourceDocumentRead.model_validate(db_obj) for db_obj in db_objs]
    if results:
        ws.emit_to_project(
            DATSEvent.SDOC_DELETED_BATCH,
            results,
            project_id=db_objs[0].get_project_id(),
        )
    return results
