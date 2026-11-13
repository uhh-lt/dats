from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from common.feature_enum import Feature
from core.auth.authz_user import AuthzUser
from modules.search_annotate.search_annotate import search_and_auto_annotate
from modules.search_annotate.search_annotate_dto import PaginatedSpanAnnotationHits
from systems.feature_system.feature_dependency import require_feature

router = APIRouter(
    prefix="/search_annotate",
    dependencies=[Depends(get_current_user)],
    tags=["search_annotate"],
)


@router.post(
    "/auto_annotate",
    dependencies=[Depends(require_feature(Feature.SEARCH_ANNOTATE))],
    response_model=PaginatedSpanAnnotationHits,
    summary="Returns the character & token-level positions needed for creating SpanAnnotations.",
)
def auto_annotate(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    query: str,
    authz_user: AuthzUser = Depends(),
) -> PaginatedSpanAnnotationHits:
    authz_user.assert_in_project(project_id)
    return search_and_auto_annotate(
        db=db,
        project_id=project_id,
        query=query,
    )
