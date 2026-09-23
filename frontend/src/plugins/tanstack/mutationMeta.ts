// eslint-disable-next-line boundaries/element-types
import type { DATSEventMap } from "@models/datsEvents";

/**
 * Typed mutation `meta` for the cache-update brain.
 *
 * A mutation tagged with `meta.datsEvent` has its response data forwarded to
 * `handleDATSEvent` by the global MutationCache in queryClient.ts — no
 * per-hook onSuccess cache logic needed. The payload is always the mutation's
 * `data` (the backend returns the affected entity DTO).
 *
 * Mutations whose cache reaction can't be expressed as a single entity event
 * (bulk ops, RPC-style, composite responses, or reactions that depend on the
 * request variables like "refetch all codes when the enabled status changed")
 * keep an explicit onSuccess that calls `handleDATSEvent` / cache helpers
 * directly.
 */
export interface DATSEventMeta extends Record<string, unknown> {
  datsEvent?: keyof DATSEventMap;
  successMessage?: string | ((data: never, variables: never) => string);
  errorMessage?: string | ((data: never, variables: never) => string);
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: DATSEventMeta;
  }
}
