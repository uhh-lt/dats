from fastapi import APIRouter, Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession, get_current_user
from common.project_router import project_router
from systems.feature_system.feature_dto import (
    FeatureActivation,
    FeatureRead,
    ProjectFeatureRead,
)
from systems.feature_system.feature_service import FeatureService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

# the Features a Project can enable, outside every project
router = APIRouter(dependencies=[Depends(get_current_user)], tags=["feature"])
# the Features of a project
project = project_router("/features", tags=[])
router.include_router(project)


# --- read operations


@router.get(
    "/features",
    response_model=list[FeatureRead],
    summary="Returns all Features a Project can enable",
)
def get_all() -> list[FeatureRead]:
    return FeatureService().read_all()


@project.get(
    "",
    response_model=list[ProjectFeatureRead],
    summary="Returns the state of every Feature in the Project: enabled, status, ready and document counts",
    tags=["mcp"],
)
def get_project_features(
    *,
    db: DBSession,
    project_id: int,
) -> list[ProjectFeatureRead]:
    return FeatureService().read_project_features(db=db, project_id=project_id)


# --- update operations


@project.post(
    "/{feature}/enable",
    response_model=list[str],
    summary="Enables the disabled Feature in the Project and computes its data for all documents. Returns the enabled Features",
)
def enable_feature(
    *,
    db: DBSession,
    project_id: int,
    feature: str,
    activation: FeatureActivation,
    ws: WebsocketEmitter = Depends(),
) -> list[str]:
    project = FeatureService().enable_feature(
        db=db,
        project_id=project_id,
        feature=FeatureService().read_by_name(name=feature),
        settings=activation.settings,
    )
    ws.emit_to_project(DATSEvent.PROJECT_UPDATED, project, project_id=project_id)
    return project.enabled_features


@project.post(
    "/{feature}/complete",
    response_model=list[str],
    summary="Completes the partly available Feature: computes its data for the documents that lack it. Returns the enabled Features",
)
def complete_feature(
    *,
    db: DBSession,
    project_id: int,
    feature: str,
    activation: FeatureActivation,
) -> list[str]:
    project = FeatureService().complete_feature(
        db=db,
        project_id=project_id,
        feature=FeatureService().read_by_name(name=feature),
        settings=activation.settings,
    )
    return project.enabled_features


@project.post(
    "/{feature}/disable",
    response_model=list[str],
    summary="Disables the partly or fully available Feature in the Project; its data is kept. Returns the enabled Features",
)
def disable_feature(
    *,
    db: DBSession,
    project_id: int,
    feature: str,
    ws: WebsocketEmitter = Depends(),
) -> list[str]:
    project = FeatureService().disable_feature(
        db=db,
        project_id=project_id,
        feature=FeatureService().read_by_name(name=feature),
    )
    ws.emit_to_project(DATSEvent.PROJECT_UPDATED, project, project_id=project_id)
    return project.enabled_features
