import { BboxAnnotationHooks } from "@api/hooks/BboxAnnotationHooks";
import { CodeHooks } from "@api/hooks/CodeHooks";
import { ProjectHooks } from "@api/hooks/ProjectHooks";
import { SdocHooks } from "@api/hooks/SdocHooks";
import { SentenceAnnotationHooks } from "@api/hooks/SentenceAnnotationHooks";
import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { TagHooks } from "@api/hooks/TagHooks";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { CodeRead } from "@models/CodeRead";
import { ProjectRead } from "@models/ProjectRead";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { TagRead } from "@models/TagRead";

export type MemosAttachedObject =
  | TagRead
  | SourceDocumentRead
  | CodeRead
  | SpanAnnotationRead
  | SentenceAnnotationRead
  | BBoxAnnotationRead
  | ProjectRead;

export interface MemosAttachedObjectQuery {
  data: MemosAttachedObject | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
}

/**
 * Hook to fetch the attached object of a memo based on its type.
 * All hooks are called unconditionally to satisfy React's rules of hooks.
 * Only the relevant query will be enabled based on the type (passing undefined disables the query).
 * @param type - The type of the attached object
 * @param id - The id of the attached object
 * @returns The query result for the attached object
 */
export const useGetMemosAttachedObject = (
  type: AttachedObjectType | undefined,
  id: number | undefined,
): MemosAttachedObjectQuery => {
  // Pass the id only when the type matches, otherwise pass undefined to disable the query
  const tagQuery = TagHooks.useGetTag(type === AttachedObjectType.TAG ? id : undefined);
  const codeQuery = CodeHooks.useGetCode(type === AttachedObjectType.CODE ? id : undefined);
  const projectQuery = ProjectHooks.useGetProject(type === AttachedObjectType.PROJECT ? id : undefined);
  const sdocQuery = SdocHooks.useGetDocument(type === AttachedObjectType.SOURCE_DOCUMENT ? id : undefined);
  const spanQuery = SpanAnnotationHooks.useGetAnnotation(type === AttachedObjectType.SPAN_ANNOTATION ? id : undefined);
  const bboxQuery = BboxAnnotationHooks.useGetAnnotation(type === AttachedObjectType.BBOX_ANNOTATION ? id : undefined);
  const sentenceQuery = SentenceAnnotationHooks.useGetAnnotation(
    type === AttachedObjectType.SENTENCE_ANNOTATION ? id : undefined,
  );

  switch (type) {
    case AttachedObjectType.TAG:
      return tagQuery;
    case AttachedObjectType.CODE:
      return codeQuery;
    case AttachedObjectType.PROJECT:
      return projectQuery;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return sdocQuery;
    case AttachedObjectType.SPAN_ANNOTATION:
      return spanQuery;
    case AttachedObjectType.BBOX_ANNOTATION:
      return bboxQuery;
    case AttachedObjectType.SENTENCE_ANNOTATION:
      return sentenceQuery;
    default: {
      // Return a disabled-query shape when no type is given
      return {
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: false,
        isSuccess: false,
        error: null,
      };
    }
  }
};
