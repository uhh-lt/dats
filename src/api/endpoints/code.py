from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.data.crud.code import crud_code
from app.core.data.crud.current_code import crud_current_code
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.code import CodeRead, CodeUpdate, CodeCreate
from app.core.data.dto.memo import MemoCreate, MemoReadCode, MemoInDB
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/code")
tags = ["code"]


@router.put("", tags=tags,
            response_model=Optional[CodeRead],
            summary="Creates a new Code",
            description="Creates a new Code and returns it with the generated ID.")
async def create_new_code(*,
                          db: Session = Depends(SQLService().get_db_session),
                          code: CodeCreate) -> Optional[CodeRead]:
    db_user = crud_code.create(db=db, create_dto=code)
    return CodeRead.from_orm(db_user)


@router.get("/current/{current_code_id}", tags=tags,
            response_model=Optional[CodeRead],
            summary="Returns the Code linked by the CurrentCode",
            description="Returns the Code linked by the CurrentCode with the given ID.")
async def get_code_by_current_code_id(*,
                                      db: Session = Depends(SQLService().get_db_session),
                                      current_code_id: int) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    cc_db_obj = crud_current_code.read(db=db, id=current_code_id)
    c_db_obj = crud_code.read(db=db, id=cc_db_obj.code_id)
    return CodeRead.from_orm(c_db_obj)


@router.get("/{id}", tags=tags,
            response_model=Optional[CodeRead],
            summary="Returns the Code",
            description="Returns the Code with the given ID.")
async def get_by_id(*,
                    db: Session = Depends(SQLService().get_db_session),
                    id: int) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_code.read(db=db, id=id)
    return CodeRead.from_orm(db_obj)


@router.patch("/{id}", tags=tags,
              response_model=CodeRead,
              summary="Updates the Code",
              description="Updates the Code with the given ID.")
async def update_by_id(*,
                       db: Session = Depends(SQLService().get_db_session),
                       id: int,
                       code: CodeUpdate) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_code.update(db=db, id=id, update_dto=code)
    return CodeRead.from_orm(db_obj)


@router.delete("/{id}", tags=tags,
               response_model=Optional[CodeRead],
               summary="Deletes the Code",
               description="Deletes the Code with the given ID.")
async def delete_by_id(*,
                       db: Session = Depends(SQLService().get_db_session),
                       id: int) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_code.remove(db=db, id=id)
    return CodeRead.from_orm(db_obj)


@router.put("/{id}/memo", tags=tags,
            response_model=Optional[MemoReadCode],
            summary="Adds a Memo to the Code",
            description="Adds a Memo to the Code with the given ID if it exists")
async def add_memo(*,
                   db: Session = Depends(SQLService().get_db_session),
                   id: int,
                   memo: MemoCreate) -> Optional[MemoReadCode]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_code(db=db, code_id=id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    attached_code = db_obj.attached_to.code
    return MemoReadCode(**memo_as_in_db_dto.dict(exclude={"attached_to"}), attached_code_id=attached_code.id)


@router.get("/{id}/memo", tags=tags,
            response_model=Optional[MemoReadCode],
            summary="Returns the Memo attached to the Code",
            description="Returns the Memo attached to the Code with the given ID if it exists.")
async def get_memo(*,
                   db: Session = Depends(SQLService().get_db_session),
                   id: int) -> Optional[MemoReadCode]:
    code_db_obj = crud_code.read(db=db, id=id)
    memo_as_in_db_dto = MemoInDB.from_orm(code_db_obj.object_handle.attached_memo)
    return MemoReadCode(**memo_as_in_db_dto.dict(exclude={"attached_to"}), attached_code_id=code_db_obj.id)
