# WebSockets

DATS uses WebSockets to push real-time events from the backend to connected clients — for example, to refresh the project list when a project is created or deleted. A status indicator at the bottom of the sidebar shows the current connection state (connected / connecting / disconnected).

## Architecture

The backend exposes an authenticated WebSocket endpoint at `/ws`. Because the API runs with multiple uvicorn workers (independent OS processes), events are fanned out across workers through a Redis Pub/Sub backplane:

```
Browser ──WS──► API worker ──publish──► Redis channel dats:ws:events ──► all API workers ──► their local clients
```

Every send operation delivers the event to matching local connections **and** publishes an envelope to Redis, so all other workers can deliver it to their own connections. Each worker skips envelopes it published itself.

Key files:

- `backend/src/systems/websocket_system/websocket_endpoint.py` — `/ws` endpoint and authentication handshake
- `backend/src/systems/websocket_system/websocket_manager.py` — per-process connection registry and Redis backplane (listener started/stopped in the FastAPI lifespan)
- `backend/src/systems/websocket_system/websocket_dto.py` — event types, payloads, and the Redis envelope
- `backend/src/repos/async_redis_repo.py` — async Redis client used by the backplane
- `frontend/src/plugins/websocket/WebSocketClient.ts` — client with automatic reconnect
- `frontend/src/plugins/websocket/websocketEventHandlers.ts` — central event → handler registry
- `frontend/src/store/global/websocketSlice.ts` — connection status state
- `frontend/src/core/navigation/WebSocketStatusIndicator.tsx` — sidebar status indicator

## Connection & Authentication

The frontend client connects to `/api/ws` (the Vite dev server proxies WebSocket upgrades with `ws: true`). Immediately after the socket opens, the client sends its JWT as the first message:

```json
{ "token": "<access-token>" }
```

The server waits up to 5 seconds for this message and closes the connection with code `1008` (policy violation) if the token is missing or invalid. If the connection drops, the client reconnects automatically with increasing delays (1s, 2s, 5s, 10s, 30s).

## Redis Configuration

The backplane uses a dedicated logical Redis database, configured via `redis.ws_idx` (environment variable `REDIS_WS_INDEX`, default `11`). This is separate from the RQ task queue database (`redis.rq_idx`), so flushing the queue never affects Pub/Sub state. Events are published to the channel `dats:ws:events`.

## Adding a New Event

Backend (`websocket_dto.py`):

1. Add the event type to `WebSocketEventType`.
2. Add a payload model and an event class, and add the event class to the `WebSocketEvent` union.
3. Send the event from service/endpoint code via the `manager` singleton — e.g. `send_personal_event`, `broadcast_to_project_users`, or `broadcast_event` (typically as a FastAPI `BackgroundTasks` task).

Frontend (`websocketEventHandlers.ts`):

4. Add the payload interface and an entry in `WebSocketEventMap`.
5. Add the handler — handlers run outside of React; use the `queryClient` singleton to invalidate queries and the redux `store` to dispatch actions.

The backend `WebSocketEventType` enum and the frontend `WebSocketEventMap` must stay in sync.
