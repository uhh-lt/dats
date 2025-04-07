from fastapi import APIRouter
from fastapi.responses import RedirectResponse

from app.core.data.dto.instance_info import InstanceInfo
from config import conf

router = APIRouter(tags=["general"])


@router.get("/heartbeat")
def heartbeat():
    return True


@router.get("/info", response_model=InstanceInfo)
def info():
    return InstanceInfo(
        is_oidc_enabled=conf.api.auth.oidc.enabled == "True",
        oidc_provider_name=conf.api.auth.oidc.name,
        is_stable=conf.api.is_stable == "True",
    )


# Allow to view docs without being logged in (?)
@router.get("/", summary="Redirection to /docs")
def root_to_docs():
    return RedirectResponse("/docs")
