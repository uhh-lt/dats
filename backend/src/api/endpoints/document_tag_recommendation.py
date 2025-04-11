from typing import Dict, List

from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud.document_tag import (
    crud_document_tag,
)
from app.core.data.crud.document_tag_recommendation import (
    crud_document_tag_recommendation_link,
)
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationLinkRead,
    DocumentTagRecommendationLinkUpdate,
    DocumentTagRecommendationResult,
)
from app.core.data.dto.ml_job import (
    MLJobRead,
    MLJobType,
)
from app.core.data.orm.document_tag_recommendation import (
    DocumentTagRecommendationLinkORM,
)
from app.core.ml.doc_tag_recommendation.doc_tag_recommendation_service import (
    DocumentClassificationService,
)
from app.core.ml.ml_service import MLService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session

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

    sdoc2recommendations: Dict[int, List[DocumentTagRecommendationLinkORM]] = {}
    for recommendation in recommendations:
        sdoc2recommendations.setdefault(recommendation.source_document_id, []).append(
            recommendation
        )

    affected_sdoc_ids = list(sdoc2recommendations.keys())
    sdoc2tags = crud_document_tag.get_tags_for_documents(
        db=db, sdoc_ids=affected_sdoc_ids
    )

    return [
        DocumentTagRecommendationResult(
            sdoc_id=sdoc_id,
            recommendation_ids=[
                recommendation.id for recommendation in recommendations
            ],
            current_tag_ids=[tag.id for tag in sdoc2tags.get(sdoc_id, [])],
            suggested_tag_ids=[
                recommendation.predicted_tag_id for recommendation in recommendations
            ],
        )
        for sdoc_id, recommendations in sdoc2recommendations.items()
    ]


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
