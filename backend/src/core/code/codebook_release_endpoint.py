from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.code.codebook_release_dto import (
    CodebookReleaseComparisonRead,
    CodebookReleaseCreate,
    CodebookReleaseTreeRead,
    PaginatedCodebookReleases,
)
from core.code.codebook_release_service import codebook_release_service

router = APIRouter(
    prefix="/codebook-release",
    dependencies=[Depends(get_current_user)],
    tags=["codebookRelease"],
)


@router.put(
    "",
    response_model=CodebookReleaseTreeRead,
    summary="Creates an immutable release from the current non-system Main tree.",
)
def create_release(
    *,
    create: CodebookReleaseCreate,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> CodebookReleaseTreeRead:
    authz_user.assert_in_project(create.project_id)
    return codebook_release_service.create(db, create_dto=create)


@router.get(
    "/project/{project_id}",
    response_model=PaginatedCodebookReleases,
    summary="Lists immutable codebook releases newest first.",
)
def list_releases(
    *,
    project_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    query: str | None = Query(default=None, max_length=200),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> PaginatedCodebookReleases:
    authz_user.assert_in_project(project_id)
    total, items = codebook_release_service.list_by_project(
        db,
        project_id=project_id,
        page=page,
        page_size=page_size,
        query=query,
    )
    return PaginatedCodebookReleases(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get(
    "/{release_id}/compare",
    response_model=CodebookReleaseComparisonRead,
    summary="Compares a release with another release or current Main.",
)
def compare_release(
    *,
    release_id: int,
    target_release_id: int | None = Query(default=None),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> CodebookReleaseComparisonRead:
    release = codebook_release_service.read(db, release_id=release_id)
    authz_user.assert_in_project(release.project_id)
    if target_release_id is not None:
        target = codebook_release_service.read(db, release_id=target_release_id)
        authz_user.assert_in_project(target.project_id)
    return codebook_release_service.compare(
        db,
        release_id=release_id,
        target_release_id=target_release_id,
    )


@router.get(
    "/{release_id}",
    response_model=CodebookReleaseTreeRead,
    summary="Returns one release and its exact read-only historical code tree.",
)
def get_release(
    *,
    release_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> CodebookReleaseTreeRead:
    release = codebook_release_service.read(db, release_id=release_id)
    authz_user.assert_in_project(release.project_id)
    return codebook_release_service.read_tree(db, release_id=release_id)
