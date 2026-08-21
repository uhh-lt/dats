import { AttachedObjectType } from "@models/AttachedObjectType";

/**
 * Describes what a memo editor should operate on:
 * either an existing memo (by id) or a (potentially new) memo attached to an object.
 */
export type MemoEditorTarget =
  | { memoId: number; attachedObjectType?: AttachedObjectType; attachedObjectId?: number }
  | { memoId?: undefined; attachedObjectType: AttachedObjectType; attachedObjectId: number };
