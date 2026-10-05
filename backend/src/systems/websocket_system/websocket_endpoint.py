import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from loguru import logger

from common.dependencies import resolve_user
from repos.db.sql_repo import SQLRepo
from systems.websocket_system.websocket_service import WebsocketService

router = APIRouter(tags=["websocket"])

websocket_service = WebsocketService()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # Wait up to 5 seconds for the authentication message
        auth_message = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
        token = auth_message.get("token")

        if not token:
            logger.warning("Closing websocket: missing auth token")
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION, reason="Missing token"
            )
            return

        # Open a short-lived session only for the auth handshake. Capture the
        # user id inside the block: on exit the transaction commits (expiring
        # ORM attributes) and closes (detaching the instance), so reading
        # current_user.id afterwards would raise DetachedInstanceError.
        with SQLRepo().transaction() as db:
            current_user = resolve_user(websocket, db, token)
            user_id = current_user.id

    except (asyncio.TimeoutError, json.JSONDecodeError, Exception) as e:
        logger.warning(f"Websocket authentication failed: {e}")
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed"
        )
        return

    await websocket_service.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()  # noqa: F841
    except WebSocketDisconnect:
        websocket_service.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"Unexpected error in websocket loop of user {user_id}: {e}")
        websocket_service.disconnect(websocket, user_id)
