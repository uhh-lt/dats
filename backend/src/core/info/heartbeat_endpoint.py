from fastapi import APIRouter

# the liveness check of the API
router = APIRouter(prefix="/heartbeat", tags=["heartbeat"])


@router.get("")
def heartbeat():
    return True
