import asyncio
import json

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from loguru import logger
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from systems.websocket_system.websocket_manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, db: Session = Depends(get_db_session)
):
    await websocket.accept()
    try:
        # Wait up to 5 seconds for the authentication message
        auth_message = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
        token = auth_message.get("token")

        if not token:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION, reason="Missing token"
            )
            return
        current_user = get_current_user(db, token)

    except (asyncio.TimeoutError, json.JSONDecodeError, Exception):
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed"
        )
        return

    await manager.connect(websocket, current_user.id)
    logger.info(f"User {current_user.id} connected to WebSocket.")
    try:
        while True:
            data = await websocket.receive_text()  # noqa: F841
    except WebSocketDisconnect:
        manager.disconnect(websocket, current_user.id)
