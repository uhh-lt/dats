from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
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


manager = ConnectionManager()
