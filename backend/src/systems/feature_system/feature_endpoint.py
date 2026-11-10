from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from common.feature_enum import Feature
from core.auth.authz_user import AuthzUser
from systems.feature_system.feature_dto import FeatureActivation, FeatureRead
from systems.feature_system.feature_service import FeatureService

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
) -> list[Feature]:
    authz_user.assert_in_project(project_id)

    return FeatureService().activate_feature(
        db=db, project_id=project_id, feature=feature, settings=activation.settings
    )


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
) -> list[Feature]:
    authz_user.assert_in_project(project_id)

    return FeatureService().disable_feature(
        db=db, project_id=project_id, feature=feature
    )
