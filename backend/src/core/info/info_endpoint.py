from fastapi import APIRouter
from fastapi.responses import RedirectResponse

from config import conf
from core.info.info_dto import InstanceInfo

router = APIRouter(tags=["general"])


@router.get("/heartbeat")
def heartbeat():
    return True


@router.get("/info", response_model=InstanceInfo)
def info():
    return InstanceInfo(
        is_oidc_enabled=len(conf.auth.oidc) > 0
        and any(x.enabled for x in conf.auth.oidc),
        oidc_provider_names=[x.name for x in conf.auth.oidc if x.enabled],
        is_stable=conf.api.is_stable,
        glitchtip_dsn=conf.glitchtip.dsn_frontend,
    )


# Allow to view docs without being logged in (?)
@router.get("/", summary="Redirection to /docs")
def root_to_docs():
    return RedirectResponse("/docs")
