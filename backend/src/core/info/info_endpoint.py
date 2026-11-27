from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse

from common.dependencies import get_current_user
from config import conf
from core.info.info_dto import InstanceInfo
from repos.llm_repo import LLMRepo
from systems.feature_system.feature_dto import FeatureRead
from systems.feature_system.feature_service import FeatureService

# every route has the tag of its first path segment
router = APIRouter()


@router.get("/heartbeat", tags=["heartbeat"])
def heartbeat():
    return True


@router.get("/info", tags=["info"], response_model=InstanceInfo)
def info():
    return InstanceInfo(
        is_oidc_enabled=len(conf.auth.oidc) > 0
        and any(x.enabled for x in conf.auth.oidc),
        oidc_provider_names=[x.name for x in conf.auth.oidc if x.enabled],
        is_stable=conf.api.is_stable,
        glitchtip_dsn=conf.glitchtip.dsn_frontend,
    )


@router.get(
    "/info/llms",
    tags=["info"],
    dependencies=[Depends(get_current_user)],
    response_model=list[str],
    summary="Get all available LLM models from the LLM Provider",
)
def get_available_models() -> list[str]:
    return LLMRepo().get_available_llms()


@router.get(
    "/info/features",
    tags=["info"],
    dependencies=[Depends(get_current_user)],
    response_model=list[FeatureRead],
    summary="Returns all Features a Project can enable",
)
def get_features() -> list[FeatureRead]:
    return FeatureService().read_all()


# a browser redirect to the docs, no API route: hidden from the schema, with an
# explicit operation id as it has no tag
@router.get("/", include_in_schema=False, operation_id="root_to_docs")
def root_to_docs():
    return RedirectResponse("/docs")
