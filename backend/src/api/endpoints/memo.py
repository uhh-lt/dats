from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.analysis.memo import MemoColumns, memo_info, memo_search
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.memo import MemoRead, MemoUpdate
from app.core.data.dto.search import PaginatedElasticSearchDocumentHits
from app.core.filters.columns import ColumnInfo
from app.core.filters.filtering import Filter
from app.core.filters.sorting import Sort

router = APIRouter(
    prefix="/memo", dependencies=[Depends(get_current_user)], tags=["memo"]
)


@router.get(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Returns the Memo with the given ID if it exists",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)

    db_obj = crud_memo.read(db=db, id=memo_id)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.patch(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Updates the Memo with the given ID if it exists",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    memo: MemoUpdate,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)

    db_obj = crud_memo.update(db=db, id=memo_id, update_dto=memo)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.delete(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Removes the Memo with the given ID if it exists",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)

    memo = crud_memo.remove(db=db, id=memo_id)

    return crud_memo.get_memo_read_dto_from_orm(db, memo)


@router.post(
    "/info",
    response_model=List[ColumnInfo[MemoColumns]],
    summary="Returns Memo Table Info.",
)
def search_memo_info(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[ColumnInfo[MemoColumns]]:
    authz_user.assert_in_project(project_id)

    return memo_info(project_id=project_id)


@router.post(
    "/search",
    response_model=PaginatedElasticSearchDocumentHits,
    summary="Returns all Memo Ids that match the query parameters.",
)
def search_memos(
    *,
    search_query: str,
    project_id: int,
    search_content: bool,
    page_number: int,
    page_size: int,
    filter: Filter[MemoColumns],
    sorts: List[Sort[MemoColumns]],
    authz_user: AuthzUser = Depends(),
) -> PaginatedElasticSearchDocumentHits:
    authz_user.assert_in_project(project_id)

    return memo_search(
        project_id=project_id,
        search_query=search_query,
        search_content=search_content,
        filter=filter,
        sorts=sorts,
        page_number=page_number,
        page_size=page_size,
    )
