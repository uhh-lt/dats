// eslint-disable-next-line boundaries/element-types
import type { WebSocketEventMap } from "@models/websocketEvents";

/**
 * Typed mutation `meta` for the cache-update brain.
 *
 * A mutation tagged with `meta.entityEvent` has its response data forwarded to
 * `handleEntityEvent` by the global MutationCache in queryClient.ts — no
 * per-hook onSuccess cache logic needed. The payload is always the mutation's
 * `data` (the backend returns the affected entity DTO).
 *
 * Mutations whose cache reaction can't be expressed as a single entity event
 * (bulk ops, RPC-style, composite responses, or reactions that depend on the
 * request variables like "refetch all codes when the enabled status changed")
 * keep an explicit onSuccess that calls `handleEntityEvent` / cache helpers
 * directly.
 */
export interface EntityEventMeta extends Record<string, unknown> {
  entityEvent?: keyof WebSocketEventMap;
  successMessage?: string | ((data: never, variables: never) => string);
  errorMessage?: string | ((data: never, variables: never) => string);
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: EntityEventMeta;
  }
}
