from fastapi import APIRouter

# the liveness check of the API
router = APIRouter(prefix="/heartbeat", tags=["heartbeat"])


# --- read operations


@router.get("", response_model=bool, summary="Answers true while the API is up")
def heartbeat() -> bool:
    return True
