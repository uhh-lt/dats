from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.tag_recommendation.tag_recommendation_crud import (
    crud_tag_recommendation_link,
)
from modules.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationLinkRead,
    TagRecommendationLinkUpdate,
    TagRecommendationResult,
)
from modules.tag_recommendation.tag_recommendation_feature import TAG_RECOMMENDATION
from modules.tag_recommendation.tag_recommendation_service import (
    TagRecommendationService,
)
from systems.feature_system.feature_service import FeatureService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/tagrecommendation",
    dependencies=[Depends(get_current_user)],
    tags=["TagRecommendation"],
)


# --- read operations


@router.get(
    "/job/{job_id}",
    response_model=list[TagRecommendationResult],
    summary="Retrieve all (non-reviewed) document tag recommendations of the given tag recommendation job.",
)
def get_all_tagrecommendations_from_job(
    *,
    db: Session = Depends(get_db_session),
    job_id: str,
    authz_user: AuthzUser = Depends(),
) -> list[TagRecommendationResult]:
    recommendations = crud_tag_recommendation_link.read_by_ml_job_id(
        db=db, ml_job_id=job_id, exclude_reviewed=True
    )
    if len(recommendations) == 0:
        return []
    project_id = recommendations[0].source_document.project_id
    authz_user.assert_in_project(project_id)
    FeatureService().assert_enabled(
        db=db, project_id=project_id, feature=TAG_RECOMMENDATION
    )

    return TagRecommendationService().group_by_document(db=db, links=recommendations)


# --- update operations


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
    ws: WebsocketEmitter = Depends(),
) -> list[TagRecommendationLinkRead]:
    authz_user.assert_in_same_project_as_many(
        Crud.TAG_RECOMMENDATION, reviewd_recommendation_ids
    )
    reviewed = crud_tag_recommendation_link.read_by_ids(
        db=db, ids=reviewd_recommendation_ids
    )
    for project_id in {link.get_project_id() for link in reviewed}:
        FeatureService().assert_enabled(
            db=db, project_id=project_id, feature=TAG_RECOMMENDATION
        )

    modifications = crud_tag_recommendation_link.update_multi(
        db=db,
        ids=reviewd_recommendation_ids,
        update_dtos=[
            TagRecommendationLinkUpdate(is_reviewed=True)
            for _ in reviewd_recommendation_ids
        ],
    )
    results = [TagRecommendationLinkRead.model_validate(m) for m in modifications]
    if results:
        ws.emit_to_projects_grouped(
            DATSEvent.TAG_RECOMMENDATION_REVIEWED_BATCH,
            modifications,
            to_dto=TagRecommendationLinkRead.model_validate,
        )
    return results
