from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from sqlalchemy.orm import Session

from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.api_key_crud import crud_api_key
from core.auth.api_key_dto import (
    ApiKeyCreatedResponse,
    ApiKeyRead,
    ExpiryDuration,
)
from core.auth.security import generate_api_key, hash_api_key
from core.user.user_orm import UserORM
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(prefix="/api-keys", tags=["api-key"])


# --- create operations


@router.put(
    "",
    response_model=ApiKeyCreatedResponse,
    summary="Generate a new API key with optional expiration.",
)
def create_api_key(
    *,
    db: Session = Depends(get_db_session),
    name: str,
    expires_in: ExpiryDuration,
    current_user: UserORM = Depends(get_current_user),
    ws: WebsocketEmitter = Depends(),
) -> ApiKeyCreatedResponse:
    raw_api_key = generate_api_key()
    hashed_key = hash_api_key(raw_api_key)

    db_key = crud_api_key.create(
        db=db,
        user_id=current_user.id,
        name=name,
        hashed_key=hashed_key,
        prefix=f"{raw_api_key[:10]}...",
        expires_at=expires_in.to_datetime(),
    )

    ws.emit_to_user(
        DATSEvent.API_KEY_CREATED,
        ApiKeyRead.model_validate(db_key),
        user_id=current_user.id,
    )

    return ApiKeyCreatedResponse(
        id=db_key.id,
        name=db_key.name,
        prefix=db_key.prefix,
        expires_at=db_key.expires_at,
        created_at=db_key.created_at,
        api_key=raw_api_key,
    )


# --- read operations


@router.get(
    "",
    response_model=list[ApiKeyRead],
    summary="List all active API keys for the current user.",
)
def list_api_keys(
    *,
    db: Session = Depends(get_db_session),
    current_user: UserORM = Depends(get_current_user),
) -> list[ApiKeyRead]:
    return crud_api_key.get_multi_by_user(db=db, user_id=current_user.id)


# --- delete operations


@router.delete(
    "/{key_id}",
    summary="Revoke/Delete an API key.",
)
def delete_api_key(
    *,
    db: Session = Depends(get_db_session),
    key_id: int,
    current_user: UserORM = Depends(get_current_user),
    ws: WebsocketEmitter = Depends(),
) -> ApiKeyRead:
    db_key = crud_api_key.get_by_id(db=db, key_id=key_id)

    if not db_key or db_key.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Key not found.",
        )

    crud_api_key.delete(db=db, id=key_id)
    result = ApiKeyRead.model_validate(db_key)
    ws.emit_to_user(DATSEvent.API_KEY_DELETED, result, user_id=current_user.id)
    return result


# --- other operations


@router.get(
    "/mcp-config",
    summary="Get MCP Client configuration",
)
def get_mcp_config(
    request: Request,
) -> dict:
    mcp_url = f"{str(request.base_url).rstrip('/')}/mcp"
    return {
        "dats-mcp-server": {
            "command": "npx",
            "args": [
                "mcp-remote",
                mcp_url,
                "--header",
                "Authorization: Bearer API_KEY_HERE",
            ],
        }
    }
