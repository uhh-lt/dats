import { BBoxAnnotationCreate } from "@models/BBoxAnnotationCreate";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { SYSTEM_USER_ID } from "@utils/GlobalConstants";

/**
 * Pending (not yet persisted) bbox annotations are rendered from local state only — they are never
 * written to the query cache and never sent to the server. Each one gets a unique NEGATIVE id so
 * that several in-flight creations can be told apart and removed individually once saved.
 * Any negative id simply means "pending" to the renderer (id < 0).
 */
let nextPendingId = -1;

/**
 * Wraps a create payload in a read-shaped shell so the renderer can draw a preview.
 * Assigns a fresh unique negative id so concurrent pendings can be told apart.
 */
export function toPendingBboxAnnotation(
  requestBody: BBoxAnnotationCreate,
  userId: number | undefined,
): BBoxAnnotationRead {
  return {
    ...requestBody,
    id: nextPendingId--,
    created: "",
    updated: "",
    user_id: userId || SYSTEM_USER_ID,
    memo_ids: [],
  };
}
