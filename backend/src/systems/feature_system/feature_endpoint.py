from fastapi import APIRouter, Depends

from common.dependencies import get_current_user
from systems.feature_system.feature_dto import FeatureRead
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
