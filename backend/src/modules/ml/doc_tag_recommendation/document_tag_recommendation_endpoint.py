from typing import Dict, List

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.job.background_job_base_dto import BackgroundJobStatus
from core.tag.document_tag_crud import crud_document_tag
from fastapi import APIRouter, Depends
from modules.ml.doc_tag_recommendation.doc_tag_recommendation_service import (
    DocumentClassificationService,
)
from modules.ml.doc_tag_recommendation.document_tag_recommendation_crud import (
    crud_document_tag_recommendation_link,
)
from modules.ml.doc_tag_recommendation.document_tag_recommendation_dto import (
    DocumentTagRecommendationLinkRead,
    DocumentTagRecommendationLinkUpdate,
    DocumentTagRecommendationResult,
)
from modules.ml.doc_tag_recommendation.document_tag_recommendation_orm import (
    DocumentTagRecommendationLinkORM,
)
from modules.ml.ml_job_dto import MLJobRead, MLJobType
from modules.ml.ml_service import MLService
from sqlalchemy.orm import Session

dcs: DocumentClassificationService = DocumentClassificationService()
mls: MLService = MLService()

router = APIRouter(
    prefix="/doctagrecommendation",
    dependencies=[Depends(get_current_user)],
    tags=["documentTagRecommendation"],
)


@router.get(
    "/{project_id}",
    response_model=List[MLJobRead],
    summary="Retrieve all finished document tag recommendation MLJobs.",
)
def get_all_doctagrecommendation_jobs(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[MLJobRead]:
    authz_user.assert_in_project(project_id)

    ml_jobs = mls.get_all_ml_jobs(project_id=project_id)
    ml_jobs = [
        ml_job
        for ml_job in ml_jobs
        if ml_job.status == BackgroundJobStatus.FINISHED
        and ml_job.parameters.ml_job_type == MLJobType.DOC_TAG_RECOMMENDATION
    ]
    ml_jobs.sort(key=lambda x: x.created, reverse=True)
    return ml_jobs


@router.get(
    "/job/{ml_job_id}",
    response_model=List[DocumentTagRecommendationResult],
    summary="Retrieve all (non-reviewed) document tag recommendations for the given ml job ID.",
)
def get_all_doctagrecommendations_from_job(
    *,
    db: Session = Depends(get_db_session),
    ml_job_id: str,
    authz_user: AuthzUser = Depends(),
) -> List[DocumentTagRecommendationResult]:
    recommendations = crud_document_tag_recommendation_link.read_by_ml_job_id(
        db=db, ml_job_id=ml_job_id, exclude_reviewed=True
    )
    if len(recommendations) == 0:
        return []
    authz_user.assert_in_project(recommendations[0].source_document.project_id)

    sdoc2recommendations: Dict[int, List[DocumentTagRecommendationLinkORM]] = {}
    for recommendation in recommendations:
        sdoc2recommendations.setdefault(recommendation.source_document_id, []).append(
            recommendation
        )

    affected_sdoc_ids = list(sdoc2recommendations.keys())
    sdoc2tags = crud_document_tag.get_tags_for_documents(
        db=db, sdoc_ids=affected_sdoc_ids
    )

    results = [
        DocumentTagRecommendationResult(
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
    response_model=List[DocumentTagRecommendationLinkRead],
    summary="The endpoint receives IDs of wrongly and correctly tagged document recommendations and sets `is_accepted` to `true` or `false`, while setting the corresponding document tags if `true`.",
)
def update_recommendations(
    *,
    db: Session = Depends(get_db_session),
    reviewd_recommendation_ids: List[int],
    authz_user: AuthzUser = Depends(),
) -> List[DocumentTagRecommendationLinkRead]:
    modifications = crud_document_tag_recommendation_link.update_multi(
        db=db,
        ids=reviewd_recommendation_ids,
        update_dtos=[
            DocumentTagRecommendationLinkUpdate(is_reviewed=True)
            for _ in reviewd_recommendation_ids
        ],
    )
    return [DocumentTagRecommendationLinkRead.model_validate(m) for m in modifications]
