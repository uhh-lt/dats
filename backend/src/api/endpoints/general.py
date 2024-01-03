from fastapi import APIRouter
from fastapi.responses import RedirectResponse

router = APIRouter()


@router.get("/heartbeat", tags=["general"])
def heartbeat():
    return True


# Allow to view docs without being logged in (?)
@router.get("/", tags=["general"], summary="Redirection to /docs")
def root_to_docs():
    return RedirectResponse("/docs")
