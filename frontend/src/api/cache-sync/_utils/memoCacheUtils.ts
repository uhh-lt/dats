import { queryClient } from "@api/queryClient";
import { bboxAnnotationQueries } from "@core/bbox-annotation/api/bboxAnnotationQueries";
import { codeQueries } from "@core/code/api/codeQueries";
import { memoQueries } from "@core/memo/api/memoQueries";
import { sentenceAnnotationQueries } from "@core/sentence-annotation/api/sentenceAnnotationQueries";
import { sdocQueries } from "@core/source-document/api/sdocQueries";
import { spanAnnotationQueries } from "@core/span-annotation/api/spanAnnotationQueries";
import { tagQueries } from "@core/tag/api/tagQueries";
import type { AttachedObjectType } from "@models/AttachedObjectType";
import type { MemoRead } from "@models/MemoRead";
import { removeSingle, setSingle } from "./cacheWriterUtils";

/**
 * Memo-specific cache writes + invalidations. Memos attach to many different
 * object types, so creating/updating/deleting one must also refresh the memo
 * indicators on the attached object and the memo workspace views.
 */

/** Invalidate the memo workspace queries (list + groups) of the given projects. */
export function invalidateMemoWorkspace(projectIds: Iterable<number>): void {
  for (const projectId of new Set(projectIds)) {
    queryClient.invalidateQueries({ queryKey: memoQueries.searchScope(projectId) });
    queryClient.invalidateQueries({ queryKey: memoQueries.searchGroupedScope(projectId) });
  }
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
  projectId: number,
  attachedObjectType: AttachedObjectType,
  attachedObjectId: number,
): void {
  switch (attachedObjectType) {
    case "source_document":
      queryClient.invalidateQueries({ queryKey: sdocQueries.byId(projectId, attachedObjectId).queryKey });
      queryClient.invalidateQueries({ queryKey: sdocQueries.searchScope(projectId) });
      break;
    case "tag":
      queryClient.invalidateQueries({ queryKey: tagQueries.byProject(projectId).queryKey });
      break;
    case "code":
      queryClient.invalidateQueries({ queryKey: codeQueries.byProject(projectId).queryKey });
      break;
    case "span_annotation":
      queryClient.invalidateQueries({ queryKey: spanAnnotationQueries.bySdocScope(projectId) });
      queryClient.invalidateQueries({ queryKey: sdocQueries.searchScope(projectId) });
      break;
    case "sentence_annotation":
      queryClient.invalidateQueries({ queryKey: sentenceAnnotationQueries.bySdocScope(projectId) });
      queryClient.invalidateQueries({ queryKey: sdocQueries.searchScope(projectId) });
      break;
    case "bbox_annotation":
      queryClient.invalidateQueries({ queryKey: bboxAnnotationQueries.bySdocScope(projectId) });
      queryClient.invalidateQueries({ queryKey: sdocQueries.searchScope(projectId) });
      break;
    default:
      break;
  }
}

/**
 * A copied annotation (accepted from another annotation) gets copies of its source's memos inside the annotation
 * create, which emits no MEMO_CREATED event. Its memo_ids already list the copies, so only the memo lists of the
 * copies and the memo workspace need a refresh.
 */
export function invalidateCopiedAnnotationMemos(
  attachedObjectType: AttachedObjectType,
  annotations: { id: number; project_id: number; source_annotation_id: number | null; memo_ids: number[] }[],
): void {
  const copiesWithMemos = annotations.filter(
    (annotation) => annotation.source_annotation_id !== null && annotation.memo_ids.length > 0,
  );
  if (copiesWithMemos.length === 0) return;
  copiesWithMemos.forEach((annotation) =>
    queryClient.invalidateQueries({
      queryKey: memoQueries.byAttachedObject(annotation.project_id, attachedObjectType, annotation.id).queryKey,
    }),
  );
  invalidateMemoWorkspace(copiesWithMemos.map((annotation) => annotation.project_id));
}

export function writeMemo(memo: MemoRead): void {
  setSingle(memoQueries.byId(memo.project_id, memo.id).queryKey, memo);
  queryClient.setQueryData(
    memoQueries.byAttachedObject(memo.project_id, memo.attached_object_type, memo.attached_object_id).queryKey,
    (old) => (old ? old.map((m) => (m.id === memo.id ? memo : m)) : old),
  );
}

export function appendMemo(memo: MemoRead): void {
  setSingle(memoQueries.byId(memo.project_id, memo.id).queryKey, memo);
  queryClient.setQueryData(
    memoQueries.byAttachedObject(memo.project_id, memo.attached_object_type, memo.attached_object_id).queryKey,
    (old) => (old ? [...old, memo] : old),
  );
}

export function removeMemo(memo: MemoRead): void {
  removeSingle(memoQueries.byId(memo.project_id, memo.id).queryKey);
  queryClient.setQueryData(
    memoQueries.byAttachedObject(memo.project_id, memo.attached_object_type, memo.attached_object_id).queryKey,
    (old) => (old ? old.filter((m) => m.id !== memo.id) : old),
  );
  invalidateAttachedObjectMemoIds(memo.project_id, memo.attached_object_type, memo.attached_object_id);
}
