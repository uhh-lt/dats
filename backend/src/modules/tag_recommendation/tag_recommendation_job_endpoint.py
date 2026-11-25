from common.dependencies import DBSession
from common.project_router import project_router
from modules.tag_recommendation.tag_recommendation_crud import (
    crud_tag_recommendation_link,
)
from modules.tag_recommendation.tag_recommendation_dto import TagRecommendationResult
from modules.tag_recommendation.tag_recommendation_feature import TAG_RECOMMENDATION
from modules.tag_recommendation.tag_recommendation_service import (
    TagRecommendationService,
)
from systems.job_system.job_service import JobService

router = project_router(
    "/jobs/tag-recommendation",
    tags=["TagRecommendation"],
    feature=TAG_RECOMMENDATION,
)


# --- read operations


@router.get(
    "/{job_id}/recommendations",
    response_model=list[TagRecommendationResult],
    summary="Retrieve all (non-reviewed) document tag recommendations of the given tag recommendation job.",
)
def get_all_tagrecommendations_from_job(
    *,
    db: DBSession,
    project_id: int,
    job_id: str,
) -> list[TagRecommendationResult]:
    JobService().read_project_job(project_id, "tag_recommendation", job_id)
    recommendations = crud_tag_recommendation_link.read_by_ml_job_id(
        db=db, project_id=project_id, ml_job_id=job_id, exclude_reviewed=True
    )
    return TagRecommendationService().group_by_document(
        db=db, project_id=project_id, links=recommendations
    )
