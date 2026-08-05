import { SpanAnnotationCreate } from "@models/SpanAnnotationCreate";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { SYSTEM_USER_ID } from "@utils/GlobalConstants";

/**
 * Pending (not yet persisted) span annotations are rendered from local state only — they are never
 * written to the query cache and never sent to the server. Each one gets a unique NEGATIVE id so
 * that several in-flight creations can be told apart and removed individually once saved.
 * Any negative id simply means "pending" to the renderer (id < 0).
 */
let nextPendingId = -1;

/**
 * Wraps a create payload in a read-shaped shell so the renderer can draw a preview.
 * Assigns a fresh unique negative id so concurrent pendings can be told apart.
 */
export function toPendingSpanAnnotation(
  requestBody: SpanAnnotationCreate,
  userId: number | undefined,
): SpanAnnotationRead {
  return {
    ...requestBody,
    id: nextPendingId--,
    text: requestBody.span_text,
    created: "",
    updated: "",
    user_id: userId || SYSTEM_USER_ID,
    group_ids: [],
    memo_ids: [],
  };
}
