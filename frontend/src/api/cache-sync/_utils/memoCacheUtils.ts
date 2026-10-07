import { QueryKey } from "@api/hooks/QueryKey";
import { codeQueries } from "@api/queries/codeQueries";
import { memoQueries } from "@api/queries/memoQueries";
import { tagQueries } from "@api/queries/tagQueries";
import { queryClient } from "@api/queryClient";
import type { AttachedObjectType } from "@models/AttachedObjectType";
import type { MemoRead } from "@models/MemoRead";
import { removeSingle, setSingle } from "./cacheWriterUtils";

/**
 * Memo-specific cache writes + invalidations. Memos attach to many different
 * object types, so creating/updating/deleting one must also refresh the memo
 * indicators on the attached object and the memo workspace views.
 */

/** Invalidate the memo workspace queries (list + groups). */
export function invalidateMemoWorkspace(): void {
  queryClient.invalidateQueries({ queryKey: memoQueries.searchScope() });
  queryClient.invalidateQueries({ queryKey: memoQueries.groupsScope() });
}

/**
 * Invalidate the "recently opened memos" lists for the given projects, so
 * deleted memos disappear from recent-memos views.
 */
export function invalidateMemoRecents(projectIds: Iterable<number>): void {
  for (const projectId of new Set(projectIds)) {
    queryClient.invalidateQueries({ queryKey: memoQueries.recent(projectId).queryKey });
  }
}

/**
 * Invalidate the caches that hold the memo_ids of the attached object, so memo
 * indicators across the UI react to memo creation/deletion.
 */
export function invalidateAttachedObjectMemoIds(
  attachedObjectType: AttachedObjectType,
  attachedObjectId: number,
): void {
  switch (attachedObjectType) {
    case "source_document":
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC, attachedObjectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    case "tag":
      queryClient.invalidateQueries({ queryKey: tagQueries.byProjectScope() });
      break;
    case "code":
      queryClient.invalidateQueries({ queryKey: codeQueries.all() });
      break;
    case "span_annotation":
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    case "sentence_annotation":
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    case "bbox_annotation":
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    default:
      break;
  }
}

export function writeMemo(memo: MemoRead): void {
  setSingle(memoQueries.byId(memo.id).queryKey, memo);
  queryClient.setQueryData(
    memoQueries.byAttachedObject(memo.attached_object_type, memo.attached_object_id).queryKey,
    (old) => (old ? old.map((m) => (m.id === memo.id ? memo : m)) : [memo]),
  );
}

export function appendMemo(memo: MemoRead): void {
  setSingle(memoQueries.byId(memo.id).queryKey, memo);
  queryClient.setQueryData(
    memoQueries.byAttachedObject(memo.attached_object_type, memo.attached_object_id).queryKey,
    (old) => (old ? [...old, memo] : [memo]),
  );
}

export function removeMemo(memo: MemoRead): void {
  removeSingle(memoQueries.byId(memo.id).queryKey);
  queryClient.setQueryData(
    memoQueries.byAttachedObject(memo.attached_object_type, memo.attached_object_id).queryKey,
    (old) => (old ? old.filter((m) => m.id !== memo.id) : old),
  );
  invalidateAttachedObjectMemoIds(memo.attached_object_type, memo.attached_object_id);
}
