from typing import Optional, List, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import skip_limit_params
from app.core.data.crud.project import crud_project
from app.core.data.dto import ProjectRead, ProjectCreate, ProjectUpdate
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/project")
tags = ["project"]


@router.put("", tags=tags,
            response_model=ProjectRead,
            summary="Creates a new Project",
            description="Creates a new Project.")
async def create_new_project(*,
                             db: Session = Depends(SQLService().get_db_session),
                             proj: ProjectCreate) -> ProjectRead:
    db_obj = crud_project.create(db=db, create_dto=proj)
    return ProjectRead.from_orm(db_obj)


@router.get("", tags=tags,
            response_model=List[ProjectRead],
            summary="Returns all Projects of the current user",
            description="Returns all Projects of the current user")
async def read_all(*,
                   db: Session = Depends(SQLService().get_db_session),
                   skip_limit: Dict[str, str] = Depends(skip_limit_params)) -> List[ProjectRead]:
    # TODO Flo: only return the projects of the current user
    db_objs = crud_project.read_multi(db=db, **skip_limit)
    return [ProjectRead.from_orm(proj) for proj in db_objs]


@router.get("/{id}", tags=tags,
            response_model=Optional[ProjectRead],
            summary="Returns the Project with the given ID",
            description="Returns the Project with the given ID if it exists")
async def read_project(*,
                       db: Session = Depends(SQLService().get_db_session),
                       id: int) -> Optional[ProjectRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.read(db=db, id=id)
    return ProjectRead.from_orm(db_obj)


@router.patch("/{id}", tags=tags,
              response_model=ProjectRead,
              summary="Updates the Project",
              description="Updates the Project with the given ID.")
async def update_project(*,
                         db: Session = Depends(SQLService().get_db_session),
                         id: int,
                         proj: ProjectUpdate) -> ProjectRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.update(db=db, id=id, update_dto=proj)
    return ProjectRead.from_orm(db_obj)


@router.delete("/{id}", tags=tags,
               response_model=ProjectRead,
               summary="Removes the Project",
               description="Removes the Project with the given ID.")
async def delete_project(*,
                         db: Session = Depends(SQLService().get_db_session),
                         id: int) -> ProjectRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.remove(db=db, id=id)
    return ProjectRead.from_orm(db_obj)
