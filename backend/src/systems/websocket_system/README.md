# Websocket System

The websocket system is DATS' generic server-to-client push channel. It lets
the backend deliver typed domain events to connected clients in real time:
any part of the backend can build an event, choose an audience (one user, a
set of users, a project's members, or everyone), and have it delivered within
milliseconds — regardless of which API worker the clients are connected to.

It is infrastructure, not a feature: the set of events is extensible (see
[Adding a New Event](#adding-a-new-event)), and the audience scopes are
generic, so new use cases can be built on it without touching the system
itself.

Design goals:

- **Zero extra work at the call site** — the endpoint already returns the
  mutation result; that same object is the event payload.
- **Type-safe end to end** — every event is a pydantic model; the payload type
  is validated when the event is built, and the frontend consumes typed
  messages.
- **Multi-worker safe** — the API runs with several uvicorn workers; events
  fan out across all of them via Redis Pub/Sub.
- **No phantom events** — events are delivered *after* the request's database
  commit, never from inside the transaction.

## Architecture Overview

```mermaid
flowchart LR
    subgraph Worker A (uvicorn)
        EP[Endpoint] --> EM[WebsocketEmitter]
        EM -->|background task| SVC[WebsocketService]
        SVC -->|local delivery| CA[Clients of A]
    end
    subgraph Redis
        CH[(channel: dats:ws:events)]
    end
    subgraph Worker B (uvicorn)
        SVC2[WebsocketService] -->|local delivery| CB[Clients of B]
    end
    SVC -->|publish envelope| CH
    CH -->|listener task| SVC2
```

The system has four parts:

| File | Role |
| --- | --- |
| [websocket_endpoint.py](websocket_endpoint.py) | The `/ws` endpoint clients connect to. Authenticates and registers connections. |
| [websocket_service.py](websocket_service.py) | `WebsocketService` — per-process connection registry + Redis Pub/Sub backplane. |
| [websocket_dependency.py](websocket_dependency.py) | `WebsocketEmitter` — the FastAPI dependency endpoints use to emit events. |
| [websocket_dto.py](websocket_dto.py) | Wire types: the `WebSocketEvent` union and the internal Redis `WebSocketEnvelope`. |

Event *definitions* live outside this folder in
[common/dats_event.py](../../common/dats_event.py), because they are domain
events, not websocket-specific machinery.

## How Clients Connect (websocket_endpoint.py)

Clients open a websocket at `/api/ws` (see
`frontend/src/plugins/websocket/WebSocketClient.ts`). Authentication is
message-based, because browsers cannot set headers on websocket handshakes:

1. The server accepts the connection immediately.
2. The client must send `{"token": "<jwt>"}` as its first message within
   5 seconds.
3. The server validates the token; on failure it closes with
   `1008 Policy Violation`.
4. On success the connection is registered under the user's ID in
   `WebsocketService.active_connections` — a `Dict[int, List[WebSocket]]`,
   so one user can have several tabs/devices connected at once.

From then on the connection is receive-only: the client just waits for events
(`{type, payload}` JSON messages) and dispatches them to its local stores.
The frontend client reconnects automatically with exponential backoff
(1s, 2s, 5s, 10s, 30s) and re-sends a fresh token on every reconnect.

## Emitting Events from Endpoints (websocket_dependency.py)

Endpoints never talk to `WebsocketService` directly. They declare the
`WebsocketEmitter` dependency and call one of its `emit_*` methods with the
mutation result:

```python
@router.put("", response_model=CodeRead)
def create_new_code(
    *,
    db: Session = Depends(get_db_session),
    code: CodeCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> CodeRead:
    ...
    result = CodeRead.model_validate(db_code)
    ws.emit_to_project(DATSEvent.CODE_CREATED, result, project_id=code.project_id)
    return result
```

The emitter provides four audience scopes:

| Method | Audience |
| --- | --- |
| `emit_to_project(event, payload, project_id=...)` | All members of a project (the common case). |
| `emit_to_user(event, payload, user_id=...)` | A single user. |
| `emit_to_users(event, payload, user_ids=[...])` | An explicit set of users. |
| `emit_to_all(event, payload)` | Every connected client (global events). |

Two rules make this safe and ergonomic:

1. **Deferred delivery.** Every `emit_*` call schedules the actual send as a
   FastAPI `BackgroundTask`, so the event fires *after* the request's
   database commit. If the transaction rolls back, no event leaks.
2. **Actor exclusion.** A JWT (human) triggerer already has the mutation
   result — it *is* the HTTP response — so they are excluded from the
   audience; their clients learn nothing new. An API-key triggerer has no
   human session, so the event is sent to everyone, including the actor's own
   connected clients. This rule applies to all four scopes; e.g.
   `emit_to_user(PROJECT_CREATED, ..., user_id=creator)` is dropped for a JWT
   creator but delivered for an API-key creator.

The payload is always the entity's read DTO — the same object the endpoint
returns. Its type is validated against the event's registered payload type
when the event is built, so a mismatched payload fails loudly in the request,
not silently on the wire.

## Event Definitions (`common/dats_event.py`)

All events are declared in one place:

- **`DATSEvent`** — a `StrEnum` listing every domain event
  (`CODE_CREATED`, `MEMO_UPDATED`, ...).
- **`_DATS_EVENT_PAYLOADS`** — a table mapping each event to its payload type
  (a read DTO).
- **Generated event models** — for each table entry, a pydantic model is
  generated with `create_model`, e.g. `CodeCreatedEvent` with
  `type: Literal[DATSEvent.CODE_CREATED]` and `payload: CodeRead`. All of
  them inherit from `DATSEventBase` (`type: DATSEvent`, `payload: BaseModel`).
- **`DATS_EVENT_TO_MODEL`** — `dict[DATSEvent, type[DATSEventBase]]`, used by
  the emitter to build events and by `main.py` to register OpenAPI webhooks.

### Adding a New Event

1. Add a member to `DATSEvent`, e.g. `FOO_CREATED = "FOO_CREATED"`.
2. Add one line to `_DATS_EVENT_PAYLOADS`: `DATSEvent.FOO_CREATED: FooRead`.
3. Emit it from your endpoint with `ws.emit_to_project(DATSEvent.FOO_CREATED, result, project_id=...)`.

That's it — the event class (`FooCreatedEvent`), the discriminated-union
membership, the OpenAPI webhook schema, and payload validation are all
derived automatically.

## The Wire Format (websocket_dto.py)

Clients receive plain event JSON:

```json
{
  "type": "CODE_CREATED",
  "payload": { "id": 42, "name": "...", "...": "..." }
}
```

`websocket_dto.py` defines `WebSocketEvent`, a discriminated union over all
generated event models (keyed by `type`). It is used for parsing and for the
OpenAPI schema. (The union members are generated dynamically, so static type
checkers cannot see it as a valid type expression — annotate with
`DATSEventBase` instead; the single `pyright: ignore` lives at the union's
usage site.)

Every event is also registered as an OpenAPI *webhook* in `main.py`, so the
generated `openapi.json` (and thus the frontend's API client) contains the
full schema of every event the server can push.

## Multi-Worker Fan-Out via Redis Pub/Sub (websocket_service.py)

The API runs with multiple uvicorn workers — independent OS processes, each
with its own connection registry. A mutation handled by worker A must still
reach clients connected to worker B. This is solved with a Redis Pub/Sub
backplane (channel `dats:ws:events`):

1. Every public send method of `WebsocketService` first delivers the event to
   the matching **local** connections, then publishes a `WebSocketEnvelope`
   to Redis.
2. Each worker runs a background listener task (started in the FastAPI
   lifespan `startup`, stopped in `shutdown`) that receives envelopes and
   delivers them to *its* local connections.
3. Each envelope carries `origin_worker` (the publisher's PID); a worker
   skips envelopes it published itself, since it already delivered them
   locally.

The envelope is an internal wrapper — never sent to clients:

```python
class WebSocketEnvelope(BaseModel):
    origin_worker: int          # publisher PID, for self-skip
    kind: Literal["users", "all"]
    user_ids: list[int] | None  # targets for kind="users"; None for "all"
    exclude_user_id: int | None # actor exclusion for kind="all"
    message: WebSocketEvent     # the actual event
```

For `kind="users"` the audience is explicit, so actor exclusion is already
baked into `user_ids` by the emitter. For `kind="all"` the audience is
resolved at delivery time on each worker, so the envelope carries
`exclude_user_id` and every worker skips that user's connections locally.

Reliability details:

- If publishing to Redis fails, local delivery has already happened; the
  failure is logged as an error (other workers will miss the event).
- If the listener's Redis connection drops, it reconnects automatically after
  5 seconds and re-subscribes.
- Dead connections are detected on send (`_send_safe`) and removed from the
  registry.

## Lifecycle (main.py)

`WebsocketService` is a singleton (`SingletonMeta`) shared by the endpoint,
the emitter, and the lifespan hooks. In `main.py`'s lifespan:

- **startup**: subscribe to the Redis channel and start the listener task.
- **shutdown**: cancel the listener, unsubscribe, and close the pub/sub
  connection.

## Use Cases

The system is generic — any event type and any audience scope can be built on
it. Current and potential uses:

- **Real-time collaboration sync (the current use case).** DATS is a
  collaborative platform: multiple users work on the same project at the same
  time. Whenever an endpoint mutates an entity (creates a code, updates a
  memo, deletes a document, ...), the mutation result is pushed to all
  affected users, so their UI updates instantly without polling or refetching.
  Without this, user A would never see user B's changes until the next page
  load.
- **Job progress / completion notifications.** Long-running background jobs
  (ML inference, imports, exports) could push status updates to the user who
  started them (`emit_to_user`).
- **Admin / system-wide announcements.** Maintenance notices or broadcast
  messages to every connected client (`emit_to_all`).
- **Presence and live cursors.** The connection registry already tracks every
  socket per user; collaborative editing features could build on it.

Adding any of these requires no changes to the system itself — only new
`DATSEvent` members and `emit_*` calls.

## Summary of the Data Flow

1. Endpoint mutates an entity and builds its read DTO.
2. `ws.emit_to_project(DATSEvent.X, dto, project_id=...)` builds and
   validates the event, computes actor exclusion, and schedules a background
   task.
3. After the DB commit, the background task calls
   `WebsocketService.broadcast_to_project_users`, which resolves the
   project's members (minus the actor).
4. The event is sent to matching local connections and published to Redis as
   an envelope.
5. Every other worker's listener receives the envelope and delivers the event
   to its local connections.
6. Clients parse `{type, payload}` and update their stores.
