from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from core.annotation.annotation_review_dto import (
    AnnotationReviewBulkResolve,
    AnnotationReviewBulkResult,
    AnnotationReviewCounts,
    AnnotationReviewItem,
    AnnotationReviewResolve,
    AnnotationReviewType,
    PaginatedAnnotationReviews,
)
from core.annotation.annotation_review_service import annotation_review_service
from core.auth.authz_user import AuthzUser

router = APIRouter(
    prefix="/annotation-review",
    dependencies=[Depends(get_current_user)],
    tags=["annotationReview"],
)


@router.get(
    "/project/{project_id}/counts",
    response_model=AnnotationReviewCounts,
    summary="Counts pending reviews by annotation type.",
)
def get_review_counts(
    *,
    project_id: int,
    branch_id: int | None = Query(default=None),
    code_id: int | None = Query(default=None),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> AnnotationReviewCounts:
    authz_user.assert_in_project(project_id)
    return AnnotationReviewCounts(
        **annotation_review_service.counts(
            db, project_id=project_id, branch_id=branch_id, code_id=code_id
        )
    )


@router.get(
    "/project/{project_id}",
    response_model=PaginatedAnnotationReviews,
    summary="Lists pending reviews for one annotation type.",
)
def list_reviews(
    *,
    project_id: int,
    annotation_type: AnnotationReviewType,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    user_id: int | None = Query(default=None),
    branch_id: int | None = Query(default=None),
    code_id: int | None = Query(default=None),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> PaginatedAnnotationReviews:
    authz_user.assert_in_project(project_id)
    total, items = annotation_review_service.list_reviews(
        db,
        project_id=project_id,
        annotation_type=annotation_type,
        page=page,
        page_size=page_size,
        user_id=user_id,
        branch_id=branch_id,
        code_id=code_id,
    )
    return PaginatedAnnotationReviews(
        total=total, page=page, page_size=page_size, items=items
    )


@router.post(
    "/project/{project_id}/bulk",
    response_model=AnnotationReviewBulkResult,
    summary="Resolves every pending review using one assigned Code snapshot.",
)
def resolve_reviews_bulk(
    *,
    project_id: int,
    resolution: AnnotationReviewBulkResolve,
    branch_id: int | None = Query(default=None),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> AnnotationReviewBulkResult:
    authz_user.assert_in_project(project_id)
    return AnnotationReviewBulkResult(
        **annotation_review_service.resolve_bulk(
            db,
            project_id=project_id,
            branch_id=branch_id,
            source_code_id=resolution.source_code_id,
            action=resolution.action,
            replacement_code_id=resolution.replacement_code_id,
        )
    )


@router.post(
    "/project/{project_id}/{annotation_type}/{annotation_id}",
    response_model=AnnotationReviewItem | None,
    summary="Resolves or deletes a pending annotation review.",
)
def resolve_review(
    *,
    project_id: int,
    annotation_type: AnnotationReviewType,
    annotation_id: int,
    branch_id: int | None = Query(default=None),
    resolution: AnnotationReviewResolve,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> AnnotationReviewItem | None:
    authz_user.assert_in_project(project_id)
    return annotation_review_service.resolve(
        db,
        project_id=project_id,
        annotation_type=annotation_type,
        annotation_id=annotation_id,
        action=resolution.action,
        replacement_code_id=resolution.replacement_code_id,
        branch_id=branch_id,
    )
