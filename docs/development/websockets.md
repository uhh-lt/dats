# WebSockets

DATS uses WebSockets to push real-time events from the backend to connected clients — for example, to refresh the project list when a project is created or deleted. A status indicator at the bottom of the sidebar shows the current connection state (connected / connecting / disconnected).

## Architecture

The backend exposes an authenticated WebSocket endpoint at `/ws`. Because the API runs with multiple uvicorn workers (independent OS processes), events are fanned out across workers through a Redis Pub/Sub backplane:

```
Browser ──WS──► API worker ──publish──► Redis channel dats:ws:fanout ──► all API workers ──► their local clients
```

Every send operation delivers the event to matching local connections **and** publishes an envelope to Redis, so all other workers can deliver it to their own connections. Each worker skips envelopes it published itself.

Key files:

- `backend/src/systems/websocket_system/websocket_endpoint.py` — `/ws` endpoint and authentication handshake
- `backend/src/systems/websocket_system/websocket_service.py` — per-process connection registry and Redis backplane (listener started/stopped in the FastAPI lifespan)
- `backend/src/systems/websocket_system/websocket_dependency.py` — `WebsocketEmitter` FastAPI dependency used by endpoints to queue events after commit
- `backend/src/systems/websocket_system/websocket_dto.py` — the Redis envelope and event (de)serialization
- `backend/src/common/dats_event.py` — the `DATSEvent` enum, event payload registry, and generated event classes
- `backend/src/repos/async_redis_repo.py` — async Redis client used by the backplane
- `frontend/src/plugins/websocket/WebSocketClient.ts` — client with automatic reconnect
- `frontend/src/plugins/websocket/websocketEventHandlers.ts` — thin dispatcher that forwards every event to the cache-sync brain
- `frontend/src/api/cache-sync/brain.ts` — central event → cache-update handler (`handleDATSEvent`)
- `frontend/src/store/global/websocketSlice.ts` — connection status state
- `frontend/src/core/navigation/WebSocketStatusIndicator.tsx` — sidebar status indicator

## Connection & Authentication

The frontend client connects to `/api/ws` (the Vite dev server proxies WebSocket upgrades with `ws: true`). Immediately after the socket opens, the client sends its JWT as the first message:

```json
{ "token": "<access-token>" }
```

The server waits up to 5 seconds for this message and closes the connection with code `1008` (policy violation) if the token is missing or invalid. If the connection drops, the client reconnects automatically with increasing delays (1s, 2s, 5s, 10s, 30s).

## Redis Configuration

The backplane uses a dedicated logical Redis database, configured via `redis.ws_idx` (environment variable `REDIS_WS_INDEX`, default `11`). This is separate from the RQ task queue database (`redis.rq_idx`), so flushing the queue never affects Pub/Sub state. Events are published to the channel configured via `redis.ws_fanout_channel` (environment variable `REDIS_WS_FANOUT_CHANNEL`, default `dats:ws:fanout`).

## Adding a New Event

Backend (`backend/src/common/dats_event.py`):

1. Add the event type to the `DATSEvent` enum.
2. Add one line to the `_DATS_EVENT_PAYLOADS` registry mapping the event type to its payload DTO (a read model, `list[...]`, or `Union[...]`). The concrete event class is generated from this table — no separate class to write.
3. Emit the event from an endpoint via the `WebsocketEmitter` dependency (`ws: WebsocketEmitter = Depends()`), choosing the audience: `emit_to_project`, `emit_to_projects_grouped` (batch, grouped by project), `emit_to_user`, `emit_to_users`, or `emit_to_all`. The emitter queues the send as a FastAPI `BackgroundTasks` task so it fires after the DB commit, and automatically excludes the acting user.

   ```python
   ws.emit_to_project(DATSEvent.CODE_CREATED, result, project_id=code.project_id)
   ```

4. Regenerate the API client (`just update-api`). The event union is exposed via OpenAPI webhooks, so this produces the matching `frontend/src/models/<Name>Event.ts` and updates `frontend/src/models/datsEvents.ts`.

Frontend (`frontend/src/api/cache-sync/brain.ts`):

5. Add a `case` for the new event type in `handleDATSEvent`. Handlers run outside of React; write caches directly via the `queryClient` singleton (and dispatch redux actions via the `store` if needed). The same handler serves both websocket pushes and local mutation responses, so the cache stays consistent regardless of the source.

The backend `DATSEvent` enum and the generated frontend `DATSEvent` union are kept in sync by the OpenAPI codegen — never hand-edit the generated files.
