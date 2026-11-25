from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from modules.tag_recommendation.tag_recommendation_crud import (
    crud_tag_recommendation_link,
)
from modules.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationLinkRead,
    TagRecommendationLinkUpdate,
)
from modules.tag_recommendation.tag_recommendation_feature import TAG_RECOMMENDATION
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router(
    "/tag-recommendations",
    tags=["TagRecommendation"],
    feature=TAG_RECOMMENDATION,
)


# --- update operations


@router.patch(
    "/review",
    response_model=list[TagRecommendationLinkRead],
    summary="The endpoint receives IDs of wrongly and correctly tagged document recommendations and sets `is_accepted` to `true` or `false`, while setting the corresponding document tags if `true`.",
)
def update_recommendations(
    *,
    db: DBSession,
    project_id: int,
    reviewd_recommendation_ids: list[int],
    ws: WebsocketEmitter = Depends(),
) -> list[TagRecommendationLinkRead]:
    modifications = crud_tag_recommendation_link.update_multi(
        db=db,
        project_id=project_id,
        ids=reviewd_recommendation_ids,
        update_dtos=[
            TagRecommendationLinkUpdate(is_reviewed=True)
            for _ in reviewd_recommendation_ids
        ],
    )
    results = [TagRecommendationLinkRead.model_validate(m) for m in modifications]
    if results:
        ws.emit_to_project(
            DATSEvent.TAG_RECOMMENDATION_REVIEWED_BATCH,
            results,
            project_id=project_id,
        )
    return results
