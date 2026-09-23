/* eslint-disable boundaries/element-types */
// This file is the websocket dispatch layer: it receives raw websocket messages
// and forwards every DATS event to the central cache-update brain.
import { handleDATSEvent } from "@api/entity-events/brain";
import type { DATSEvent } from "@models/datsEvents";

export function handleWebSocketEvent(type: string, payload: unknown): void {
  handleDATSEvent({ type, payload } as DATSEvent, "websocket");
}
