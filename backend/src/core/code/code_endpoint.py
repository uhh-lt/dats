from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.code.code_crud import crud_code
from core.code.code_dto import (
    CodeCreate,
    CodeDelete,
    CodeRead,
    CodeSnapshotsRequest,
    CodeUpdate,
    PaginatedCodeChangelog,
)
from core.code.code_filter_dto import (
    CodeFilterConceptRead,
    CodeFilterVersionSummary,
    PaginatedCodeFilterVersions,
)
from core.code.code_filter_service import code_filter_service
from core.code.code_service import code_service

router = APIRouter(
    prefix="/code", dependencies=[Depends(get_current_user)], tags=["code"]
)


@router.get(
    "/project/{project_id}/filter-concepts",
    response_model=list[CodeFilterConceptRead],
    summary="Lists all concepts and historical aliases in one codebook context.",
)
def get_filter_concepts(
    *,
    project_id: int,
    branch_id: int | None = Query(default=None),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[CodeFilterConceptRead]:
    authz_user.assert_in_project(project_id)
    return code_filter_service.list_concepts(
        db,
        project_id=project_id,
        branch_id=branch_id,
    )


@router.get(
    "/project/{project_id}/concept/{concept_id}/filter-version-summary",
    response_model=CodeFilterVersionSummary,
    summary="Returns current, released, and recent versions of a code concept.",
)
def get_filter_version_summary(
    *,
    project_id: int,
    concept_id: UUID,
    branch_id: int | None = Query(default=None),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> CodeFilterVersionSummary:
    authz_user.assert_in_project(project_id)
    return code_filter_service.version_summary(
        db,
        project_id=project_id,
        concept_id=concept_id,
        branch_id=branch_id,
    )


@router.get(
    "/project/{project_id}/concept/{concept_id}/filter-versions",
    response_model=PaginatedCodeFilterVersions,
    summary="Searches the complete version history of a code concept.",
)
def get_filter_versions(
    *,
    project_id: int,
    concept_id: UUID,
    branch_id: int | None = Query(default=None),
    query: str | None = Query(default=None, max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> PaginatedCodeFilterVersions:
    authz_user.assert_in_project(project_id)
    total, items = code_filter_service.list_versions(
        db,
        project_id=project_id,
        concept_id=concept_id,
        branch_id=branch_id,
        query=query,
        page=page,
        page_size=page_size,
    )
    return PaginatedCodeFilterVersions(
        total=total, page=page, page_size=page_size, items=items
    )


@router.put("", response_model=CodeRead, summary="Creates a versioned Code.")
def create_new_code(
    *,
    db: Session = Depends(get_db_session),
    code: CodeCreate,
    authz_user: AuthzUser = Depends(),
) -> CodeRead:
    authz_user.assert_in_project(code.project_id)
    db_code = code_service.create(db, create_dto=code, author_id=authz_user.user.id)
    return CodeRead.model_validate(db_code)


@router.get(
    "/project/{project_id}/concept/{concept_id}/history",
    response_model=list[CodeRead],
    summary="Returns the complete history of one logical Code.",
)
def get_history(
    *,
    project_id: int,
    concept_id: UUID,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[CodeRead]:
    authz_user.assert_in_project(project_id)
    return [
        CodeRead.model_validate(code)
        for code in code_service.history(
            db, project_id=project_id, concept_id=concept_id
        )
    ]


@router.get(
    "/project/{project_id}/changelog",
    response_model=PaginatedCodeChangelog,
    summary="Returns paginated code changes for the selected codebook.",
)
def get_changelog(
    *,
    project_id: int,
    branch_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> PaginatedCodeChangelog:
    authz_user.assert_in_project(project_id)
    total, items = code_service.changelog(
        db,
        project_id=project_id,
        branch_id=branch_id,
        page=page,
        page_size=page_size,
    )
    return PaginatedCodeChangelog(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.post(
    "/snapshots/batch",
    response_model=list[CodeRead],
    summary="Returns current or historical Code snapshots in one request.",
)
def get_snapshots(
    *,
    request: CodeSnapshotsRequest,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[CodeRead]:
    authz_user.assert_in_project(request.project_id)
    return [
        CodeRead.model_validate(code)
        for code in code_service.read_snapshots(
            db,
            project_id=request.project_id,
            code_ids=request.code_ids,
        )
    ]


@router.get(
    "/project/{project_id}",
    response_model=list[CodeRead],
    summary="Returns the visible Main or branch Code tree.",
)
def get_by_project(
    *,
    project_id: int,
    branch_id: int | None = Query(default=None),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[CodeRead]:
    authz_user.assert_in_project(project_id)
    return [
        CodeRead.model_validate(code)
        for code in code_service.read_visible(
            db, project_id=project_id, branch_id=branch_id
        )
    ]


@router.get(
    "/{code_id}",
    response_model=CodeRead,
    summary="Returns a specific current or historical Code snapshot.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> CodeRead:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    return CodeRead.model_validate(crud_code.read(db=db, id=code_id))


@router.patch(
    "/{code_id}",
    response_model=CodeRead,
    summary="Creates an updated snapshot of a Code.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    code: CodeUpdate,
    authz_user: AuthzUser = Depends(),
) -> CodeRead:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    db_code = code_service.update(
        db, code_id=code_id, update_dto=code, author_id=authz_user.user.id
    )
    return CodeRead.model_validate(db_code)


@router.delete(
    "/{code_id}",
    response_model=list[CodeRead],
    summary="Tombstones a Code, optionally cascading to its subtree.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    delete: CodeDelete,
    authz_user: AuthzUser = Depends(),
) -> list[CodeRead]:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    return [
        CodeRead.model_validate(code)
        for code in code_service.tombstone(
            db,
            code_id=code_id,
            delete_dto=delete,
            author_id=authz_user.user.id,
        )
    ]
