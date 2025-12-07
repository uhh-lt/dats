import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import CodeHooks from "../../api/CodeHooks.ts";
import SdocHooks from "../../api/SdocHooks.ts";
import SentenceAnnotationHooks from "../../api/SentenceAnnotationHooks.ts";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks.ts";
import TagHooks from "../../api/TagHooks.ts";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";

/**
 * Hook to fetch the attached object of a memo based on its type.
 * All hooks are called unconditionally to satisfy React's rules of hooks.
 * Only the relevant query will be enabled based on the type (passing undefined disables the query).
 * @param type - The type of the attached object
 * @param id - The id of the attached object
 * @returns The query result for the attached object
 */
const useGetMemosAttachedObject = (type: AttachedObjectType | undefined, id: number | undefined) => {
  // Pass the id only when the type matches, otherwise pass undefined to disable the query
  const tagQuery = TagHooks.useGetTag(type === AttachedObjectType.TAG ? id : undefined);
  const codeQuery = CodeHooks.useGetCode(type === AttachedObjectType.CODE ? id : undefined);
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
    case AttachedObjectType.SOURCE_DOCUMENT:
      return sdocQuery;
    case AttachedObjectType.SPAN_ANNOTATION:
      return spanQuery;
    case AttachedObjectType.BBOX_ANNOTATION:
      return bboxQuery;
    case AttachedObjectType.SENTENCE_ANNOTATION:
      return sentenceQuery;
    default: {
      // Return a "disabled" query-like object when type is undefined
      const placeholder: CodeRead = {
        id: 0,
        name: "",
        color: "",
        description: "",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        project_id: 0,
        is_system: false,
        memo_ids: [],
      };
      return {
        data: placeholder,
        isLoading: false,
        isError: false,
        isSuccess: type === undefined,
        error: null,
      };
    }
  }
};

export default useGetMemosAttachedObject;
