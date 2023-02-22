from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.memo import MemoUpdate, MemoRead

router = APIRouter(prefix="/memo")
tags = ["memo"]


@router.get("/{memo_id}", tags=tags,
            response_model=Optional[MemoRead],
            summary="Returns the Memo",
            description="Returns the Memo with the given ID if it exists")
async def get_by_id(*,
                    db: Session = Depends(get_db_session),
                    memo_id: int) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.read(db=db, id=memo_id)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.patch("/{memo_id}", tags=tags,
              response_model=Optional[MemoRead],
              summary="Updates the Memo",
              description="Updates the Memo with the given ID if it exists")
async def update_by_id(*,
                       db: Session = Depends(get_db_session),
                       memo_id: int,
                       memo: MemoUpdate) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.update(db=db, id=memo_id, update_dto=memo)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.delete("/{memo_id}", tags=tags,
               response_model=Optional[MemoRead],
               summary="Removes the Memo",
               description="Removes the Memo with the given ID if it exists")
async def delete_by_id(*,
                       db: Session = Depends(get_db_session),
                       memo_id: int) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    memo = await get_by_id(db=db, memo_id=memo_id)
    crud_memo.remove(db=db, id=memo_id)
    return memo