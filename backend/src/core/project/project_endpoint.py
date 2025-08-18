from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from core.project.project_dto import (
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
)
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from fastapi import APIRouter, Depends
from repos.db.crud_base import NoSuchElementError
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/project",
    dependencies=[Depends(get_current_user)],
    tags=["project"],
)


@router.put(
    "",
    response_model=ProjectRead,
    summary="Creates a new Project",
)
def create_new_project(
    *,
    db: Session = Depends(get_db_session),
    proj: ProjectCreate,
    current_user: UserORM = Depends(get_current_user),
) -> ProjectRead:
    db_obj = crud_project.create(db=db, create_dto=proj, creating_user=current_user)
    return ProjectRead.model_validate(db_obj)


@router.get(
    "/{proj_id}",
    response_model=ProjectRead,
    summary="Returns the Project with the given ID if it exists",
)
def read_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> ProjectRead:
    authz_user.assert_in_project(proj_id)

    db_obj = crud_project.read(db=db, id=proj_id)
    return ProjectRead.model_validate(db_obj)


@router.patch(
    "/{proj_id}",
    response_model=ProjectRead,
    summary="Updates the Project with the given ID.",
)
def update_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    proj: ProjectUpdate,
    authz_user: AuthzUser = Depends(),
) -> ProjectRead:
    authz_user.assert_in_project(proj_id)
    db_obj = crud_project.update(db=db, id=proj_id, update_dto=proj)
    return ProjectRead.model_validate(db_obj)


@router.delete(
    "/{proj_id}",
    response_model=ProjectRead,
    summary="Removes the Project with the given ID.",
)
def delete_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> ProjectRead:
    authz_user.assert_in_project(proj_id)
    db_obj = crud_project.delete(db=db, id=proj_id)
    return ProjectRead.model_validate(db_obj)


@router.get(
    "/{proj_id}/resolve_filename/{filename}",
    response_model=int,
    summary=(
        "Returns the Id of the SourceDocument identified by project_id and filename if it exists"
    ),
)
def resolve_filename(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    filename: str,
    only_finished: bool = True,
    authz_user: AuthzUser = Depends(),
) -> int:
    authz_user.assert_in_project(proj_id)

    sdoc = crud_sdoc.read_by_filename(
        db=db, proj_id=proj_id, only_finished=only_finished, filename=filename
    )
    if sdoc is None:
        raise NoSuchElementError(
            SourceDocumentORM, project_id=proj_id, filename=filename
        )
    return sdoc.id


@router.get(
    "/user/projects",
    response_model=list[ProjectRead],
    summary="Returns all Projects of the logged-in User",
)
def get_user_projects(
    *,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[ProjectRead]:
    db_obj = crud_user.read(db=db, id=authz_user.user.id)
    return [ProjectRead.model_validate(proj) for proj in db_obj.projects]
