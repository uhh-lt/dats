from api.dependencies import get_current_user
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse

from api.dependencies import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/heartbeat", tags=["general"])
async def heartbeat():
    return True


@router.get("/", tags=["general"], description="Redirection to /docs")
async def root_to_docs():
    return RedirectResponse("/docs")
