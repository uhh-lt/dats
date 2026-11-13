from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from systems.feature_system.feature_dto import (
    FeatureActivation,
    FeatureRead,
    ProjectFeatureRead,
)
from systems.feature_system.feature_service import FeatureService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/feature",
    dependencies=[Depends(get_current_user)],
    tags=["feature"],
)


# --- read operations


@router.get(
    "",
    response_model=list[FeatureRead],
    summary="Returns all Features a Project can enable, with the Features they require",
)
def get_all() -> list[FeatureRead]:
    return FeatureService().read_all()


@router.get(
    "/project/{project_id}",
    response_model=list[ProjectFeatureRead],
    summary="Returns the state of every Feature in the Project: enabled, status, ready and document counts",
    tags=["mcp"],
)
def get_project_features(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[ProjectFeatureRead]:
    authz_user.assert_in_project(project_id)

    return FeatureService().read_project_features(db=db, project_id=project_id)


# --- update operations


@router.post(
    "/project/{project_id}/{feature}/enable",
    response_model=list[str],
    summary="Enables the disabled Feature in the Project and computes its data for all documents. Returns the enabled Features",
)
def enable_feature(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    feature: str,
    activation: FeatureActivation,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[str]:
    authz_user.assert_in_project(project_id)

    project = FeatureService().enable_feature(
        db=db,
        project_id=project_id,
        feature=FeatureService().read_by_name(name=feature),
        settings=activation.settings,
    )
    ws.emit_to_project(DATSEvent.PROJECT_UPDATED, project, project_id=project_id)
    return project.enabled_features


@router.post(
    "/project/{project_id}/{feature}/complete",
    response_model=list[str],
    summary="Completes the partly available Feature: computes its data for the documents that lack it. Returns the enabled Features",
)
def complete_feature(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    feature: str,
    activation: FeatureActivation,
    authz_user: AuthzUser = Depends(),
) -> list[str]:
    authz_user.assert_in_project(project_id)

    project = FeatureService().complete_feature(
        db=db,
        project_id=project_id,
        feature=FeatureService().read_by_name(name=feature),
        settings=activation.settings,
    )
    return project.enabled_features


@router.post(
    "/project/{project_id}/{feature}/disable",
    response_model=list[str],
    summary="Disables the partly or fully available Feature in the Project; its data is kept. Returns the enabled Features",
)
def disable_feature(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    feature: str,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> list[str]:
    authz_user.assert_in_project(project_id)

    project = FeatureService().disable_feature(
        db=db,
        project_id=project_id,
        feature=FeatureService().read_by_name(name=feature),
    )
    ws.emit_to_project(DATSEvent.PROJECT_UPDATED, project, project_id=project_id)
    return project.enabled_features
