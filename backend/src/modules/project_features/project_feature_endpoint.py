from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from common.feature_enum import Feature
from core.auth.authz_user import AuthzUser
from modules.doc_processing.step_planning_service import StepPlanningService
from modules.project_features.project_feature_dto import (
    FeatureActivation,
    ProjectFeatureRead,
)
from modules.project_features.project_feature_service import ProjectFeatureService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/feature",
    dependencies=[Depends(get_current_user)],
    tags=["feature"],
)


# --- read operations


@router.get(
    "/project/{project_id}",
    response_model=list[ProjectFeatureRead],
    summary="Returns the state of every Feature in the Project: enabled, ready, document coverage and missing steps",
    tags=["mcp"],
)
def get_project_features(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[ProjectFeatureRead]:
    authz_user.assert_in_project(project_id)

    return ProjectFeatureService().read_project_features(db=db, project_id=project_id)


# --- update operations


@router.put(
    "/project/{project_id}/{feature}",
    response_model=list[Feature],
    summary="Enables the Feature in the Project, or completes it: computes its data for the documents that lack it. Returns the enabled Features",
)
def activate_feature(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    feature: Feature,
    activation: FeatureActivation,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[Feature]:
    authz_user.assert_in_project(project_id)

    project = StepPlanningService().enable_feature(
        db=db, project_id=project_id, feature=feature, settings=activation.settings
    )
    ws.emit_to_project(DATSEvent.PROJECT_UPDATED, project, project_id=project_id)
    return project.enabled_features


@router.post(
    "/project/{project_id}/{feature}/restart",
    response_model=list[Feature],
    summary="Restarts the processing of the enabled Feature: plans and starts its processing steps again (steps whose job still runs compute twice). Returns the enabled Features",
)
def restart_feature(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    feature: Feature,
    activation: FeatureActivation,
    authz_user: AuthzUser = Depends(),
) -> list[Feature]:
    authz_user.assert_in_project(project_id)

    project = StepPlanningService().restart_feature(
        db=db, project_id=project_id, feature=feature, settings=activation.settings
    )
    return project.enabled_features


@router.delete(
    "/project/{project_id}/{feature}",
    response_model=list[Feature],
    summary="Disables the Feature in the Project; its data is kept. Returns the enabled Features",
)
def disable_feature(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    feature: Feature,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[Feature]:
    authz_user.assert_in_project(project_id)

    project = StepPlanningService().disable_feature(
        db=db, project_id=project_id, feature=feature
    )
    ws.emit_to_project(DATSEvent.PROJECT_UPDATED, project, project_id=project_id)
    return project.enabled_features
