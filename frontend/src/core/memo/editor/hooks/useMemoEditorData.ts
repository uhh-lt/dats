import { MemoHooks } from "@api/hooks/MemoHooks";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { CodeRead } from "@models/CodeRead";
import { MemoRead } from "@models/MemoRead";
import { ProjectRead } from "@models/ProjectRead";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { TagRead } from "@models/TagRead";
import { useGetMemosAttachedObject } from "../../useGetMemosAttachedObject";
import { MemoEditorTarget } from "../types/MemoEditorTarget";

export type MemoAttachedObject =
  | TagRead
  | SourceDocumentRead
  | CodeRead
  | SpanAnnotationRead
  | SentenceAnnotationRead
  | BBoxAnnotationRead
  | ProjectRead;

export interface MemoEditorData {
  /** The loaded memo, or undefined when creating a new memo for an attached object. */
  memo: MemoRead | undefined;
  attachedObject: MemoAttachedObject | undefined;
  attachedObjectType: AttachedObjectType | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Resolves a MemoEditorTarget into the memo and its attached object.
 */
export function useMemoEditorData(target: MemoEditorTarget | undefined): MemoEditorData {
  const memoQuery = MemoHooks.useGetMemo(target?.memoId);

  const attachedObjectType = target?.attachedObjectType ?? memoQuery.data?.attached_object_type;
  const attachedObjectId = target?.memoId ? memoQuery.data?.attached_object_id : target?.attachedObjectId;
  const attachedObjectQuery = useGetMemosAttachedObject(attachedObjectType, attachedObjectId);

  const isLoading =
    (!!target?.memoId && memoQuery.isLoading) || (attachedObjectType !== undefined && attachedObjectQuery.isLoading);

  const error = memoQuery.error ?? (attachedObjectType !== undefined ? attachedObjectQuery.error : null);

  return {
    memo: memoQuery.data,
    attachedObject: attachedObjectQuery.data,
    attachedObjectType,
    isLoading,
    error,
  };
}
