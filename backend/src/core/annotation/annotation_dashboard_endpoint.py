from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from core.annotation.annotation_dashboard_dto import RecentAnnotatedDocument
from core.annotation.annotation_dashboard_service import annotation_dashboard_service
from core.auth.authz_user import AuthzUser

router = APIRouter(
    prefix="/annotation-dashboard",
    dependencies=[Depends(get_current_user)],
    tags=["annotationDashboard"],
)


@router.get(
    "/project/{project_id}/recent-documents",
    response_model=list[RecentAnnotatedDocument],
    summary="Lists the current user's recently annotated documents.",
)
def get_recent_documents(
    *,
    project_id: int,
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[RecentAnnotatedDocument]:
    authz_user.assert_in_project(project_id)
    return annotation_dashboard_service.recent_documents(
        db,
        project_id=project_id,
        user_id=authz_user.user.id,
        limit=limit,
    )
