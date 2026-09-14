from enum import StrEnum
from typing import Annotated, List, Literal

from pydantic import BaseModel, Field


class WebSocketEventType(StrEnum):
    """All websocket event types. Must stay in sync with the frontend's
    WebSocketEventMap (frontend/src/plugins/websocket/websocketEventHandlers.ts)."""

    PROJECT_CREATED = "PROJECT_CREATED"
    PROJECT_DELETED = "PROJECT_DELETED"


# ─── Event payloads ──────────────────────────────────────────────────────────
# One DTO per event type, matching the payload interfaces on the frontend.


class ProjectEventPayload(BaseModel):
    project_id: int


# ─── Events ──────────────────────────────────────────────────────────────────
# One event class per event type. The `type` field is a Literal so pydantic can
# discriminate the union when parsing (e.g. envelopes received via Redis).


class ProjectCreatedEvent(BaseModel):
    type: Literal[WebSocketEventType.PROJECT_CREATED] = (
        WebSocketEventType.PROJECT_CREATED
    )
    payload: ProjectEventPayload


class ProjectDeletedEvent(BaseModel):
    type: Literal[WebSocketEventType.PROJECT_DELETED] = (
        WebSocketEventType.PROJECT_DELETED
    )
    payload: ProjectEventPayload


WebSocketEvent = Annotated[
    ProjectCreatedEvent | ProjectDeletedEvent,
    Field(discriminator="type"),
]


# ─── Redis backplane envelope ────────────────────────────────────────────────
# Internal wrapper used to fan out events across API worker processes.
# Never sent to clients — clients only receive the `message` (a WebSocketEvent).


class WebSocketEnvelope(BaseModel):
    origin_worker: int
    kind: Literal["users", "all"]
    user_ids: List[int] | None
    message: WebSocketEvent
