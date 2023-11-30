from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.memo import MemoRead, MemoUpdate

router = APIRouter(
    prefix="/memo", dependencies=[Depends(get_current_user)], tags=["memo"]
)


@router.get(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Returns the Memo",
    description="Returns the Memo with the given ID if it exists",
)
async def get_by_id(*, db: Session = Depends(get_db_session), memo_id: int) -> MemoRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.read(db=db, id=memo_id)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.patch(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Updates the Memo",
    description="Updates the Memo with the given ID if it exists",
)
async def update_by_id(
    *, db: Session = Depends(get_db_session), memo_id: int, memo: MemoUpdate
) -> MemoRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.update(db=db, id=memo_id, update_dto=memo)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.delete(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Removes the Memo",
    description="Removes the Memo with the given ID if it exists",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), memo_id: int
) -> MemoRead:
    # TODO Flo: only if the user has access?
    memo = crud_memo.remove(db=db, id=memo_id)
    return MemoRead.model_validate(memo)
