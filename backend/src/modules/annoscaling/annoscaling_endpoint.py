from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.auth.authz_user import AuthzUser
from modules.annoscaling.annoscaling_dto import (
    AnnoscalingConfirmSuggest,
    AnnoscalingResult,
    AnnoscalingSuggest,
)
from modules.annoscaling.annoscaling_feature import ANNOTATION_SCALING
from modules.annoscaling.annoscaling_service import AnnoScalingService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router(
    "/annotation-scaling", tags=["annotationScaling"], feature=ANNOTATION_SCALING
)

ass: AnnoScalingService = AnnoScalingService()


@router.post(
    "/suggestions",
    summary="Suggest annotations",
    description="Suggest annotations",
)
def compute_suggestions(
    *,
    db: DBSession,
    project_id: int,
    dto: AnnoscalingSuggest,
    authz_user: AuthzUser = Depends(),
) -> list[AnnoscalingResult]:

    return ass.suggest(
        db=db,
        project_id=project_id,
        user_ids=[authz_user.user.id],
        code_id=dto.code_id,
        reject_code_id=dto.reject_code_id,
        top_k=dto.top_k,
    )


@router.put(
    "/suggestions/confirm",
    response_model=list[SpanAnnotationRead],
    summary="Suggest annotations",
    description="Suggest annotations",
)
def confirm_suggestions(
    *,
    db: DBSession,
    project_id: int,
    dto: AnnoscalingConfirmSuggest,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[SpanAnnotationRead]:

    results = ass.confirm_suggestions(
        db=db,
        project_id=project_id,
        user_id=authz_user.user.id,
        code_id=dto.code_id,
        reject_code_id=dto.reject_code_id,
        accept=[(a.sdoc_id, a.sentence) for a in dto.accept],
        reject=[(r.sdoc_id, r.sentence) for r in dto.reject],
    )
    if results:
        ws.emit_to_project(
            DATSEvent.SPAN_ANNOTATION_CREATED_BATCH,
            results,
            project_id=project_id,
        )
    return results
