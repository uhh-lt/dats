from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_dto import SourceDocumentDataRead
from core.doc.source_document_dto import SourceDocumentRead, SourceDocumentUpdate
from repos.filesystem_repo import FilesystemRepo

router = APIRouter(
    prefix="/sdoc", dependencies=[Depends(get_current_user)], tags=["sourceDocument"]
)


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

    sdoc_data = crud_sdoc.read_data(db=db, id=sdoc_id)
    return SourceDocumentDataRead.model_validate(sdoc_data)


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
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_obj = crud_sdoc.delete(db=db, id=sdoc_id)
    return SourceDocumentRead.model_validate(db_obj)


@router.patch(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Updates the SourceDocument with the given ID.",
)
def update_sdoc(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    sdoc: SourceDocumentUpdate,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_obj = crud_sdoc.update(db=db, id=sdoc_id, update_dto=sdoc)
    return SourceDocumentRead.model_validate(db_obj)


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
    return [s.id for s in sdoc.folder.source_documents]


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
