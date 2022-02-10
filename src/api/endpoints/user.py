from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.data.crud.user import crud_user
# from api.auth.jwt_oauth2 import authenticate, credentials_exception, generate_jwt, current_user
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
