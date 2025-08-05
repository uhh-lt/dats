from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.tag.tag_crud import crud_tag
from fastapi import APIRouter, Depends
from modules.ml.tag_recommendation.tag_recommendation_crud import (
    crud_tag_recommendation_link,
)
from modules.ml.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationLinkRead,
    TagRecommendationLinkUpdate,
    TagRecommendationResult,
)
from modules.ml.tag_recommendation.tag_recommendation_orm import (
    TagRecommendationLinkORM,
)
from modules.ml.tag_recommendation.tag_recommendation_service import (
    DocumentClassificationService,
)
from sqlalchemy.orm import Session

dcs: DocumentClassificationService = DocumentClassificationService()

router = APIRouter(
    prefix="/tagrecommendation",
    dependencies=[Depends(get_current_user)],
    tags=["TagRecommendation"],
)


@router.get(
    "/{project_id}",
    response_model=list[int],
    summary="Retrieve all finished tag recommendation MLJobs.",
)
def get_all_tagrecommendation_jobs(
    *,
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[int]:
    authz_user.assert_in_project(project_id)

    # TODO: FIXME
    # ml_jobs = mls.get_all_ml_jobs(project_id=project_id)
    # ml_jobs = [
    #     ml_job
    #     for ml_job in ml_jobs
    #     if ml_job.status == BackgroundJobStatus.FINISHED
    #     and ml_job.parameters.ml_job_type == MLJobType.TAG_RECOMMENDATION
    # ]
    # ml_jobs.sort(key=lambda x: x.created, reverse=True)
    # return [ml_job.id for ml_job in ml_jobs]
    return []


@router.get(
    "/job/{ml_job_id}",
    response_model=list[TagRecommendationResult],
    summary="Retrieve all (non-reviewed) document tag recommendations for the given ml job ID.",
)
def get_all_tagrecommendations_from_job(
    *,
    db: Session = Depends(get_db_session),
    ml_job_id: str,
    authz_user: AuthzUser = Depends(),
) -> list[TagRecommendationResult]:
    recommendations = crud_tag_recommendation_link.read_by_ml_job_id(
        db=db, ml_job_id=ml_job_id, exclude_reviewed=True
    )
    if len(recommendations) == 0:
        return []
    authz_user.assert_in_project(recommendations[0].source_document.project_id)

    sdoc2recommendations: dict[int, list[TagRecommendationLinkORM]] = {}
    for recommendation in recommendations:
        sdoc2recommendations.setdefault(recommendation.source_document_id, []).append(
            recommendation
        )

    affected_sdoc_ids = list(sdoc2recommendations.keys())
    sdoc2tags = crud_tag.read_tags_for_documents(db=db, sdoc_ids=affected_sdoc_ids)

    results = [
        TagRecommendationResult(
            sdoc_id=sdoc_id,
            recommendation_ids=[
                recommendation.id for recommendation in recommendations
            ],
            current_tag_ids=[tag.id for tag in sdoc2tags.get(sdoc_id, [])],
            suggested_tag_ids=[
                recommendation.predicted_tag_id for recommendation in recommendations
            ],
            scores=[
                recommendation.prediction_score for recommendation in recommendations
            ],
        )
        for sdoc_id, recommendations in sdoc2recommendations.items()
    ]
    return results


@router.patch(
    "/review_recommendations",
    response_model=list[TagRecommendationLinkRead],
    summary="The endpoint receives IDs of wrongly and correctly tagged document recommendations and sets `is_accepted` to `true` or `false`, while setting the corresponding document tags if `true`.",
)
def update_recommendations(
    *,
    db: Session = Depends(get_db_session),
    reviewd_recommendation_ids: list[int],
    authz_user: AuthzUser = Depends(),
) -> list[TagRecommendationLinkRead]:
    modifications = crud_tag_recommendation_link.update_multi(
        db=db,
        ids=reviewd_recommendation_ids,
        update_dtos=[
            TagRecommendationLinkUpdate(is_reviewed=True)
            for _ in reviewd_recommendation_ids
        ],
    )
    return [TagRecommendationLinkRead.model_validate(m) for m in modifications]
