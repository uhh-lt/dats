import { queryClient } from "@api/queryClient";
import { annotationQueries } from "@core/annotation/api/annotationQueries";
import { codeQueries } from "@core/code/api/codeQueries";
import { memoQueries } from "@core/memo/api/memoQueries";
import { sdocQueries } from "@core/source-document/api/sdocQueries";
import { tagQueries } from "@core/tag/api/tagQueries";
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
      queryClient.invalidateQueries({ queryKey: sdocQueries.detail(attachedObjectId).queryKey });
      queryClient.invalidateQueries({ queryKey: sdocQueries.search.documentsScope() });
      break;
    case "tag":
      queryClient.invalidateQueries({ queryKey: tagQueries.byProjectScope() });
      break;
    case "code":
      queryClient.invalidateQueries({ queryKey: codeQueries.all() });
      break;
    case "span_annotation":
      queryClient.invalidateQueries({ queryKey: annotationQueries.span.bySdocScope() });
      queryClient.invalidateQueries({ queryKey: sdocQueries.search.documentsScope() });
      break;
    case "sentence_annotation":
      queryClient.invalidateQueries({ queryKey: annotationQueries.sentence.bySdocScope() });
      queryClient.invalidateQueries({ queryKey: sdocQueries.search.documentsScope() });
      break;
    case "bbox_annotation":
      queryClient.invalidateQueries({ queryKey: annotationQueries.bbox.bySdocScope() });
      queryClient.invalidateQueries({ queryKey: sdocQueries.search.documentsScope() });
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
