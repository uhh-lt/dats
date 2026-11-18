import { AnnotationResult } from "@models/AnnotationResult";
import { SentenceAnnotationResult } from "@models/SentenceAnnotationResult";

type AnyAnnotationResult = AnnotationResult | SentenceAnnotationResult;

// the number of annotations the run created in the document of a result
export function countAnnotations(result: AnyAnnotationResult): number {
  return Object.values(result.annotation_count_by_code_id).reduce((sum, count) => sum + count, 0);
}

// the first document the run annotated
export function findFirstAnnotatedSdocId(results: AnyAnnotationResult[]): number | undefined {
  return results.find((result) => countAnnotations(result) > 0)?.sdoc_id;
}
