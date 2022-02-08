from fastapi import APIRouter
from fastapi.responses import RedirectResponse

router = APIRouter()


@router.get("/heartbeat", tags=["general"])
async def heartbeat():
    return True


@router.get("/", tags=["general"], description="Redirection to /docs")
async def root_to_docs():
    return RedirectResponse("/docs")
