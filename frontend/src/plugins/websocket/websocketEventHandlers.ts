/* eslint-disable boundaries/element-types */
// This file is the central websocket event management system. It handles every
// websocket event type in one place, so it's simpler to keep everything here
// rather than splitting into multiple files.
import { userProjectsQueryOptions } from "@api/hooks/ProjectHooks";
import { queryClient } from "@api/queryClient";

// ─── Event payload types ───────────────────────────────────────────────────────
// Each event type defines its own payload type, matching what the backend sends.

export interface ProjectEventPayload {
  project_id: number;
}

// ─── Registry ──────────────────────────────────────────────────────────────────

/**
 * Central map of every websocket event type → its payload type.
 *
 * Adding support for a new event = one line here + one handler below.
 */
export interface WebSocketEventMap {
  PROJECT_CREATED: ProjectEventPayload;
  PROJECT_DELETED: ProjectEventPayload;
}

/**
 * Central map of every websocket event type → its handler.
 *
 * Handlers run outside of React. Use the `queryClient` singleton to invalidate
 * queries and the redux `store` to dispatch actions.
 */
const websocketEventHandlers: {
  [K in keyof WebSocketEventMap]: (payload: WebSocketEventMap[K]) => void;
} = {
  PROJECT_CREATED: () =>
    queryClient.invalidateQueries({
      queryKey: userProjectsQueryOptions().queryKey,
    }),
  PROJECT_DELETED: () =>
    queryClient.invalidateQueries({
      queryKey: userProjectsQueryOptions().queryKey,
    }),
};

export function handleWebSocketEvent(type: string, payload: unknown): void {
  const handler = websocketEventHandlers[type as keyof WebSocketEventMap];
  if (!handler) {
    console.warn(`Received unknown WebSocket event type: ${type}`);
    return;
  }
  // The registry guarantees handler/payload compatibility by construction.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler(payload as any);
}
