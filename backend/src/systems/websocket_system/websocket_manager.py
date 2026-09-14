import asyncio
import os
from typing import Dict, List

from fastapi import WebSocket
from loguru import logger
from pydantic import ValidationError
from redis.asyncio.client import PubSub
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM
from repos.async_redis_repo import AsyncRedisRepo
from systems.websocket_system.websocket_dto import WebSocketEnvelope, WebSocketEvent

# Redis Pub/Sub channel used to fan out websocket events across all API workers.
WEBSOCKET_CHANNEL = "dats:ws:events"

# Delay before attempting to re-establish the Redis listener after a failure.
REDIS_RECONNECT_DELAY_SECONDS = 5


class ConnectionManager(metaclass=SingletonMeta):
    """
    Manages WebSocket connections for THIS worker process and bridges
    events across all API worker processes via Redis Pub/Sub.

    Since the API runs with multiple uvicorn workers (independent OS
    processes), an event created on worker A must reach clients connected
    to worker B. Every public send method therefore:
      1. delivers the event to matching local connections, and
      2. publishes an envelope to Redis so all OTHER workers can deliver
         it to their local connections.

    Messages originating from this worker (`origin_worker == own pid`) are
    skipped in the listener to avoid double delivery.
    """

    def __init__(self):
        """Initialize the per-process connection registry and Redis listener state."""
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.worker_pid: int = os.getpid()
        self._pubsub: PubSub | None = None
        self._listener_task: asyncio.Task | None = None

    # ─── Lifecycle ───────────────────────────────────────────────────────────

    async def startup(self) -> None:
        """
        Subscribe to the websocket channel and start the background listener.
        Called once per worker from the FastAPI lifespan startup.
        """
        if self._listener_task is not None:
            logger.debug(
                "WS startup() called but listener is already running, skipping"
            )
            return

        pubsub = AsyncRedisRepo().redis_connection().pubsub()
        await pubsub.subscribe(WEBSOCKET_CHANNEL)
        self._pubsub = pubsub
        self._listener_task = asyncio.create_task(
            self._redis_listener(), name=f"ws-redis-listener-{self.worker_pid}"
        )
        logger.info(
            f"WS subscribed to Redis channel '{WEBSOCKET_CHANNEL}' and started listener task"
        )

    async def shutdown(self) -> None:
        """
        Stop the listener and clean up Redis pub/sub resources.
        Called once per worker from the FastAPI lifespan shutdown.
        """
        logger.info(
            f"Shutting down websocket manager "
            f"({self._local_connection_count()} local connections still open)"
        )
        if self._listener_task is not None:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
            self._listener_task = None

        if self._pubsub is not None:
            try:
                await self._pubsub.unsubscribe(WEBSOCKET_CHANNEL)
                await self._pubsub.close()
            except Exception as e:
                logger.warning(f"Error while closing websocket pub/sub: {e}")
            self._pubsub = None

        logger.info("Websocket manager shut down")

    # ─── Local connection registry ───────────────────────────────────────────

    async def connect(self, websocket: WebSocket, user_id: int):
        """Register a new websocket connection for the given user on this worker."""
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(
            f"User {user_id} connected to websocket "
            f"(now {len(self.active_connections[user_id])} socket(s) for this user, "
            f"{self._local_connection_count()} total on this worker)"
        )

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove a websocket connection of the given user from this worker."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)

            # clean up the dictionary if the user closes all their tabs
            if len(self.active_connections[user_id]) == 0:
                del self.active_connections[user_id]
        logger.info(
            f"User {user_id} disconnected from websocket "
            f"({self._local_connection_count()} total connections left on this worker)"
        )

    def _local_connection_count(self) -> int:
        """Return the total number of websocket connections held by this worker."""
        return sum(len(sockets) for sockets in self.active_connections.values())

    # ─── Public send API (local delivery + publish to other workers) ────────

    # sends an event to all active WebSocket connections of a specific user
    async def send_personal_event(self, user_id: int, event: WebSocketEvent):
        """Send an event to one user, both locally and on all other workers."""
        await self._send_to_users_local([user_id], event)
        await self._publish(
            WebSocketEnvelope(
                origin_worker=self.worker_pid,
                kind="users",
                user_ids=[user_id],
                message=event,
            )
        )

    # broadcasts an event to all connected users, regardless of their user_id (could be used in the future for admin notifications)
    async def broadcast_event(self, event: WebSocketEvent):
        """Broadcast an event to every connected user on all workers."""
        await self._send_to_all_local(event)
        await self._publish(
            WebSocketEnvelope(
                origin_worker=self.worker_pid,
                kind="all",
                user_ids=None,
                message=event,
            )
        )

    async def broadcast_to_multiple_users(
        self, user_ids: List[int], event: WebSocketEvent
    ):
        """Send an event to the given users, both locally and on all other workers."""
        await self._send_to_users_local(user_ids, event)
        await self._publish(
            WebSocketEnvelope(
                origin_worker=self.worker_pid,
                kind="users",
                user_ids=user_ids,
                message=event,
            )
        )

    async def broadcast_to_project_users(
        self,
        db: Session,
        event: WebSocketEvent,
        *,
        proj_id: int | None = None,
        proj_db_obj: ProjectORM | None = None,
        exclude_user_id: int | None = None,
    ):
        """Send an event to all members of a project, optionally excluding one user."""
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

        await self.broadcast_to_multiple_users(user_ids=user_ids, event=event)

    # ─── Redis backplane ─────────────────────────────────────────────────────

    async def _publish(self, envelope: WebSocketEnvelope) -> None:
        """Publish an event envelope to Redis so other workers can deliver it."""
        try:
            redis_conn = AsyncRedisRepo().redis_connection()
            await redis_conn.publish(WEBSOCKET_CHANNEL, envelope.model_dump_json())
            logger.debug(
                f"Published websocket event '{envelope.message.type}' "
                f"(kind={envelope.kind}, user_ids={envelope.user_ids}) "
                f"to channel '{WEBSOCKET_CHANNEL}'"
            )
        except Exception as e:
            # Local delivery already happened; other workers will miss this
            # event, so this must be visible in the logs.
            logger.error(
                f"Failed to publish websocket event "
                f"'{envelope.message.type}' to Redis: {e}"
            )

    async def _redis_listener(self) -> None:
        """
        Background loop that receives events published by OTHER workers and
        delivers them to this worker's local connections.

        Reconnects automatically after a short delay if the Redis
        connection drops; exits cleanly when cancelled during shutdown.
        """
        try:
            while True:
                assert self._pubsub is not None
                try:
                    async for raw_message in self._pubsub.listen():
                        if raw_message["type"] != "message":
                            continue
                        await self._handle_redis_message(raw_message["data"])
                except asyncio.CancelledError:
                    raise
                except Exception as e:
                    logger.error(
                        f"Websocket Redis listener error: {e}. "
                        f"Reconnecting in {REDIS_RECONNECT_DELAY_SECONDS}s..."
                    )
                    await asyncio.sleep(REDIS_RECONNECT_DELAY_SECONDS)
                    await self._resubscribe()
        except asyncio.CancelledError:
            logger.info("Websocket Redis listener task cancelled")
            raise

    async def _resubscribe(self) -> None:
        """Rebuild the pub/sub subscription after a Redis failure."""
        try:
            if self._pubsub is not None:
                try:
                    await self._pubsub.close()
                except Exception:
                    pass
            pubsub = AsyncRedisRepo().redis_connection().pubsub()
            await pubsub.subscribe(WEBSOCKET_CHANNEL)
            self._pubsub = pubsub
            logger.info(
                f"Re-subscribed to websocket Redis channel '{WEBSOCKET_CHANNEL}'"
            )
        except Exception as e:
            logger.error(f"Failed to re-subscribe to websocket Redis channel: {e}")

    async def _handle_redis_message(self, data: str) -> None:
        """Validate a raw Redis message and deliver it to this worker's local connections."""
        try:
            envelope = WebSocketEnvelope.model_validate_json(data)
        except ValidationError:
            logger.warning(
                f"Received malformed websocket envelope on channel "
                f"'{WEBSOCKET_CHANNEL}': {data!r}"
            )
            return

        # Skip our own events: they were already delivered locally.
        if envelope.origin_worker == self.worker_pid:
            return

        logger.debug(
            f"Received websocket event '{envelope.message.type}' "
            f"(kind={envelope.kind}, user_ids={envelope.user_ids}) from worker "
            f"{envelope.origin_worker}"
        )
        if envelope.kind == "all":
            await self._send_to_all_local(envelope.message)
        else:
            await self._send_to_users_local(envelope.user_ids or [], envelope.message)

    # ─── Local delivery helpers ──────────────────────────────────────────────

    async def _send_to_users_local(
        self, user_ids: List[int], event: WebSocketEvent
    ) -> None:
        """Deliver an event to the local connections of the given users."""
        for user_id in user_ids:
            user_sockets = list(self.active_connections.get(user_id, []))
            for connection in user_sockets:
                await self._send_safe(connection, user_id, event)

    async def _send_to_all_local(self, event: WebSocketEvent) -> None:
        """Deliver an event to all local connections of this worker."""
        for user_id, user_sockets in list(self.active_connections.items()):
            for connection in list(user_sockets):
                await self._send_safe(connection, user_id, event)

    async def _send_safe(
        self, connection: WebSocket, user_id: int, event: WebSocketEvent
    ) -> None:
        """Send an event, removing the connection if it turns out to be dead."""
        try:
            await connection.send_text(event.model_dump_json())
        except Exception as e:
            logger.warning(f"Removing dead websocket of user {user_id}: {e}")
            self.disconnect(connection, user_id)


manager = ConnectionManager()
