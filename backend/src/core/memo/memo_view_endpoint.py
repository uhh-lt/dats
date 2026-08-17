from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.memo.memo_view_crud import crud_memo_view
from core.memo.memo_view_dto import (
    MemoViewCreate,
    MemoViewRead,
    MemoViewReorder,
    MemoViewUpdate,
)

router = APIRouter(
    prefix="/memoView",
    dependencies=[Depends(get_current_user)],
    tags=["memoView"],
)


@router.post("", response_model=MemoViewRead, summary="Creates a personal Memo view")
def create(
    *,
    db: Session = Depends(get_db_session),
    view: MemoViewCreate,
    authz_user: AuthzUser = Depends(),
) -> MemoViewRead:
    authz_user.assert_in_project(view.project_id)
    db_view = crud_memo_view.create(db=db, create_dto=view, user_id=authz_user.user.id)
    return MemoViewRead.model_validate(db_view)


@router.get(
    "/project/{project_id}",
    response_model=list[MemoViewRead],
    summary="Returns the current user's Memo views in a project",
)
def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[MemoViewRead]:
    authz_user.assert_in_project(project_id)
    db_views = crud_memo_view.read_by_user_and_project(
        db=db, project_id=project_id, user_id=authz_user.user.id
    )
    return [MemoViewRead.model_validate(db_view) for db_view in db_views]


@router.put(
    "/project/{project_id}/order",
    response_model=list[MemoViewRead],
    summary="Reorders the current user's Memo views in a project",
)
def reorder(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    view_order: MemoViewReorder,
    authz_user: AuthzUser = Depends(),
) -> list[MemoViewRead]:
    authz_user.assert_in_project(project_id)
    db_views = crud_memo_view.reorder(
        db=db,
        project_id=project_id,
        user_id=authz_user.user.id,
        ordered_view_ids=view_order.view_ids,
    )
    return [MemoViewRead.model_validate(db_view) for db_view in db_views]


@router.patch(
    "/{view_id}", response_model=MemoViewRead, summary="Updates a personal Memo view"
)
def update(
    *,
    db: Session = Depends(get_db_session),
    view_id: int,
    view_update: MemoViewUpdate,
    authz_user: AuthzUser = Depends(),
) -> MemoViewRead:
    view = crud_memo_view.read(db=db, id=view_id)
    authz_user.assert_in_project(view.project_id)
    authz_user.assert_is_same_user(view.user_id)
    db_view = crud_memo_view.update(db=db, id=view_id, update_dto=view_update)
    return MemoViewRead.model_validate(db_view)


@router.delete(
    "/{view_id}", response_model=MemoViewRead, summary="Deletes a personal Memo view"
)
def delete(
    *,
    db: Session = Depends(get_db_session),
    view_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoViewRead:
    view = crud_memo_view.read(db=db, id=view_id)
    authz_user.assert_in_project(view.project_id)
    authz_user.assert_is_same_user(view.user_id)
    result = MemoViewRead.model_validate(view)
    crud_memo_view.delete(db=db, id=view_id)
    return result
