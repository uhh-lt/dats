from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.auth.authz_user import AuthzUser
from modules.annoscaling.annoscaling_dto import (
    AnnoscalingConfirmSuggest,
    AnnoscalingResult,
    AnnoscalingSuggest,
)
from modules.annoscaling.annoscaling_service import AnnoScalingService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/annoscaling",
    tags=["annoscaling"],
    dependencies=[Depends(get_current_user)],
)

ass: AnnoScalingService = AnnoScalingService()


@router.post(
    "/suggest",
    summary="Suggest annotations",
    description="Suggest annotations",
)
def suggest(
    *,
    db: Session = Depends(get_db_session),
    dto: AnnoscalingSuggest,
    authz_user: AuthzUser = Depends(),
) -> list[AnnoscalingResult]:
    authz_user.assert_in_project(dto.project_id)

    return ass.suggest(
        db=db,
        project_id=dto.project_id,
        user_ids=[authz_user.user.id],
        code_id=dto.code_id,
        reject_code_id=dto.reject_cide_id,
        top_k=dto.top_k,
    )


@router.post(
    "/confirm_suggestions",
    response_model=list[SpanAnnotationRead],
    summary="Suggest annotations",
    description="Suggest annotations",
)
def confirm_suggestions(
    *,
    db: Session = Depends(get_db_session),
    dto: AnnoscalingConfirmSuggest,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[SpanAnnotationRead]:
    authz_user.assert_in_project(dto.project_id)

    results = ass.confirm_suggestions(
        db=db,
        project_id=dto.project_id,
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
            project_id=dto.project_id,
        )
    return results
