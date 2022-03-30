from typing import Optional, List, Union

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.data.crud.code import crud_code
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.user import crud_user
# from api.auth.jwt_oauth2 import authenticate, credentials_exception, generate_jwt, current_user
from app.core.data.dto.code import CodeRead, CodeCreate
from app.core.data.dto.memo import MemoReadCode, MemoReadSpanAnnotation, MemoReadAnnotationDocument, \
    MemoReadProject, MemoReadSourceDocument
from app.core.data.dto.user import UserRead, UserCreate, UserUpdate
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/user")
tags = ["user"]


@router.put("/register", tags=tags,
            response_model=UserRead,
            summary="Registers a new User",
            description="Registers a new User and returns it with the generated ID.")
async def register(*,
                   db: Session = Depends(SQLService().get_db_session),
                   user: UserCreate) -> Optional[UserRead]:
    db_user = crud_user.create(db=db, create_dto=user)
    return UserRead.from_orm(db_user)


@router.get("/{id}", tags=tags,
            response_model=Optional[UserRead],
            summary="Returns the User",
            description="Returns the User with the given ID if it exists")
async def get_by_id(*,
                    db: Session = Depends(SQLService().get_db_session),
                    id: int) -> Optional[UserRead]:
    db_user = crud_user.read(db=db, id=id)
    return UserRead.from_orm(db_user)


@router.patch("/{id}", tags=tags,
              response_model=Optional[UserRead],
              summary="Updates the User",
              description="Updates the User with the given ID if it exists")
async def update_by_id(*,
                       db: Session = Depends(SQLService().get_db_session),
                       id: int,
                       user: UserUpdate) -> Optional[UserRead]:
    db_user = crud_user.update(db=db, id=id, update_dto=user)
    return UserRead.from_orm(db_user)


@router.delete("/{id}", tags=tags,
               response_model=Optional[UserRead],
               summary="Removes the User",
               description="Removes the User with the given ID if it exists")
async def delete_by_id(*,
                       db: Session = Depends(SQLService().get_db_session),
                       id: int) -> Optional[UserRead]:
    db_user = crud_user.remove(db=db, id=id)
    return UserRead.from_orm(db_user)


@router.put("/{id}/code", tags=tags,
            response_model=Optional[CodeRead],
            summary="Creates a new Code for the User",
            description="Creates a new Code for the User with the given ID")
async def create_user_code(*,
                           id: int,
                           db: Session = Depends(SQLService().get_db_session),
                           code: CodeCreate) -> Optional[CodeRead]:
    # Flo: Do we really want to create codes here and not at PUT/code !? Since a code is owned by a project and a user
    #  it would make more sense for me tbh. Then we would also not need to check id == code.user_id
    if not code.user_id == id:
        raise ValueError("Code.user_id does not match user id")
    # TODO Flo: only if the user has access?
    db_obj = crud_code.create(db=db, create_dto=code)
    return CodeRead.from_orm(db_obj)


@router.get("/{id}/code", tags=tags,
            response_model=List[CodeRead],
            summary="Returns all Codes of the User",
            description="Returns all Codes of the User with the given ID")
async def get_user_codes(*,
                         id: int,
                         db: Session = Depends(SQLService().get_db_session)) -> List[CodeRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_user.read(db=db, id=id)
    return [CodeRead.from_orm(code) for code in db_obj.codes]


@router.delete("/{id}/code", tags=tags,
               response_model=Optional[UserRead],
               summary="Removes all Codes of the User",
               description="Removes all Codes of the User with the given ID if it exists")
async def delete_user_codes(*,
                            id: int,
                            db: Session = Depends(SQLService().get_db_session)) -> Optional[UserRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_user.remove_all_codes(db=db, id=id)
    return UserRead.from_orm(db_obj)


@router.get("/{id}/memo", tags=tags,
            response_model=List[Union[MemoReadCode,
                                      MemoReadSpanAnnotation,
                                      MemoReadAnnotationDocument,
                                      MemoReadSourceDocument,
                                      MemoReadProject]],
            summary="Returns all Memos of the User",
            description="Returns all Memos of the User with the given ID")
async def get_user_memos(*,
                         id: int,
                         db: Session = Depends(SQLService().get_db_session)) -> List[Union[MemoReadCode,
                                                                                           MemoReadSpanAnnotation,
                                                                                           MemoReadAnnotationDocument,
                                                                                           MemoReadSourceDocument,
                                                                                           MemoReadProject]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_user.read(db=db, id=id)
    return [crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=memo) for memo in db_obj.memos]


@router.delete("/{id}/code", tags=tags,
               response_model=Optional[UserRead],
               summary="Removes all Memos of the User",
               description="Removes all Memos of the User with the given ID if it exists")
async def delete_user_memos(*,
                            id: int,
                            db: Session = Depends(SQLService().get_db_session)) -> Optional[UserRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_user.remove_all_memos(db=db, id=id)
    return UserRead.from_orm(db_obj)
