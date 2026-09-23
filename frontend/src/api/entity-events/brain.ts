import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import type { WebSocketEventMap } from "@models/websocketEvents";
import {
  appendListItem,
  removeListItem,
  removeMapItem,
  replaceListItem,
  sweepPrefix,
  upsertMapItem,
} from "./cacheWriterUtils";
import {
  appendMemo,
  invalidateAttachedObjectMemoIds,
  invalidateMemoWorkspace,
  removeMemo,
  writeMemo,
} from "./memoInvalidationUtils";

/**
 * The entity events the brain knows how to apply to the cache. This is a
 * subset of the generated `WebSocketEventMap` — the backend emits the same
 * DTO that the mutation endpoint returns, so one handler serves both sources.
 *
 * When adding a new entity, extend this Pick, add a case to the brain's
 * switch, and tag the mutation with `meta.entityEvent`.
 */
export type EntityEventMap = Pick<
  WebSocketEventMap,
  | "CODE_CREATED"
  | "CODE_UPDATED"
  | "CODE_DELETED"
  | "TAG_CREATED"
  | "TAG_UPDATED"
  | "TAG_DELETED"
  | "MEMO_CREATED"
  | "MEMO_UPDATED"
  | "MEMO_UPDATED_BATCH"
  | "MEMO_DELETED"
>;

export type EntityEventType = keyof EntityEventMap;

/** Discriminated union of all entity events. */
export type EntityEvent = {
  [K in EntityEventType]: { type: K; payload: EntityEventMap[K] };
}[EntityEventType];

/** Where an event originated. Currently informational (logging/debugging). */
export type EntityEventSource = "mutation" | "websocket";

// ── The brain ────────────────────────────────────────────────────────────────

/**
 * Central cache-update brain. Every entity event — whether it arrived as a
 * mutation response or a websocket push — is handled here exactly once.
 *
 * Entity caches are written directly (zero refetch); derived/search/statistics
 * caches are invalidated. The `source` is currently only used for debugging.
 */
export function handleEntityEvent(event: EntityEvent, source: EntityEventSource): void {
  void source;
  switch (event.type) {
    // ── Codes ─────────────────────────────────────────────────────────────
    case "CODE_CREATED":
      upsertMapItem(QueryKey.PROJECT_CODES, event.payload.project_id, event.payload);
      break;
    case "CODE_UPDATED":
      upsertMapItem(QueryKey.PROJECT_CODES, event.payload.project_id, event.payload);
      break;
    case "CODE_DELETED": {
      const code = event.payload;
      removeMapItem(QueryKey.PROJECT_CODES, code.project_id, code.id);
      // Deleting a code cascades to its annotations in the DB, which the
      // frontend cannot observe directly — invalidate annotation queries.
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATION] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATION] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SENTENCE_ANNOTATION] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_WHITEBOARDS, code.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_ENTITY_STATISTICS, code.id] });
      break;
    }

    // ── Tags ──────────────────────────────────────────────────────────────
    case "TAG_CREATED":
      appendListItem(QueryKey.PROJECT_TAGS, event.payload.project_id, event.payload);
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
      break;
    case "TAG_UPDATED":
      replaceListItem(QueryKey.PROJECT_TAGS, event.payload.project_id, event.payload);
      break;
    case "TAG_DELETED": {
      const tag = event.payload;
      // Sweep the tag out of every cached per-sdoc tag list.
      sweepPrefix<number[]>(QueryKey.SDOC_TAGS, (old) => (old ? old.filter((tagId) => tagId !== tag.id) : old));
      removeListItem(QueryKey.PROJECT_TAGS, tag.project_id, tag.id);
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
      break;
    }

    // ── Memos ─────────────────────────────────────────────────────────────
    case "MEMO_CREATED":
      appendMemo(event.payload);
      invalidateAttachedObjectMemoIds(event.payload.attached_object_type, event.payload.attached_object_id);
      invalidateMemoWorkspace();
      break;
    case "MEMO_UPDATED":
      writeMemo(event.payload);
      invalidateMemoWorkspace();
      break;
    case "MEMO_UPDATED_BATCH":
      event.payload.forEach(writeMemo);
      invalidateMemoWorkspace();
      break;
    case "MEMO_DELETED":
      removeMemo(event.payload);
      invalidateMemoWorkspace();
      break;

    default: {
      const _exhaustive: never = event;
      console.warn("Unhandled entity event", _exhaustive);
    }
  }
}
