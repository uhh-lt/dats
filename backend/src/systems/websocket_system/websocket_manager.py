from typing import Dict, List

from fastapi import WebSocket
from sqlalchemy.orm import Session

from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)

            # clean up the dictionary if the user closes all their tabs
            if len(self.active_connections[user_id]) == 0:
                del self.active_connections[user_id]

    # sends a personal event to all active WebSocket connections of a specific user
    async def send_personal_event(
        self, user_id: int, event_type: str, payload: dict | None = None
    ):
        message = {"type": event_type, "payload": payload or {}}
        user_sockets = self.active_connections.get(user_id, [])

        for connection in user_sockets:
            await connection.send_json(message)

    # broadcasts an event to all connected users, regardless of their user_id (could be used in the future for admin notifications)
    async def broadcast_event(self, event_type: str, payload: dict | None = None):
        message = {"type": event_type, "payload": payload or {}}
        for user_sockets in self.active_connections.values():
            for connection in user_sockets:
                await connection.send_json(message)

    async def broadcast_to_multiple_users(
        self, user_ids: List[int], event_type: str, payload: dict | None = None
    ):
        message = {"type": event_type, "payload": payload or {}}

        for user_id in user_ids:
            user_sockets = self.active_connections.get(user_id, [])
            for connection in user_sockets:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_project_users(
        self,
        db: Session,
        event_type: str,
        payload: dict | None = None,
        *,
        proj_id: int | None = None,
        proj_db_obj: ProjectORM | None = None,
        exclude_user_id: int | None = None,
    ):

        if not proj_db_obj and not proj_id:
            raise ValueError("You must provide either 'proj_id' or 'proj_db_obj'")
        if not proj_db_obj and proj_id:
            proj_db_obj = crud_project.read(db=db, id=proj_id)

        assert proj_db_obj is not None
        if exclude_user_id is not None:
            user_ids = [
                user.id for user in proj_db_obj.users if user.id != exclude_user_id
            ]
        else:
            user_ids = [user.id for user in proj_db_obj.users]

        await self.broadcast_to_multiple_users(
            user_ids=user_ids, event_type=event_type, payload=payload
        )


manager = ConnectionManager()
