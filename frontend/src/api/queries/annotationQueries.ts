import { BboxAnnotationService } from "@api/services/BboxAnnotationService";
import { SentenceAnnotationService } from "@api/services/SentenceAnnotationService";
import { SpanAnnotationService } from "@api/services/SpanAnnotationService";
import { queryOptions, skipToken } from "@tanstack/react-query";

const annotationRoot = () => ["annotations"] as const;

/**
 * Span annotations.
 *
 *   spanQueries.all()                      ["annotations", "span"]
 *   spanQueries.byId(spanId)               ["annotations", "span", "detail", spanId]
 *   spanQueries.byUserCode(codeId)         ["annotations", "span", "userCode", codeId]
 *   spanQueries.bySdoc(sdocId, userId)     ["annotations", "span", "sdoc", sdocId, userId]
 */
const spanQueries = {
  all: () => [...annotationRoot(), "span"] as const,

  // a single span annotation
  byIdScope: () => [...spanQueries.all(), "detail"] as const,
  byId: (spanId: number | null | undefined) =>
    queryOptions({
      queryKey: [...spanQueries.byIdScope(), spanId] as const,
      queryFn: !spanId ? skipToken : () => SpanAnnotationService.getById({ spanId }),
      staleTime: 1000 * 60 * 5,
    }),

  // all span annotations of the logged-in user that use a code
  byUserCodeScope: () => [...spanQueries.all(), "userCode"] as const,
  byUserCode: (codeId: number | null | undefined) =>
    queryOptions({
      queryKey: [...spanQueries.byUserCodeScope(), codeId] as const,
      queryFn: !codeId ? skipToken : () => SpanAnnotationService.getByUserCode({ codeId }),
    }),

  // all span annotations of one user in one sdoc
  bySdocScope: () => [...spanQueries.all(), "sdoc"] as const,
  // prefix of all span annotation queries of one sdoc (any user), for invalidation
  bySdocOfSdocScope: (sdocId: number) => [...spanQueries.bySdocScope(), sdocId] as const,
  bySdoc: (sdocId: number | null | undefined, userId: number | null | undefined) =>
    queryOptions({
      queryKey: [...spanQueries.bySdocScope(), sdocId, userId] as const,
      queryFn: !sdocId || !userId ? skipToken : () => SpanAnnotationService.getBySdocAndUser({ sdocId, userId }),
    }),
};

/**
 * Bounding box annotations (same layout as span annotations, under "bbox").
 */
const bboxQueries = {
  all: () => [...annotationRoot(), "bbox"] as const,

  byIdScope: () => [...bboxQueries.all(), "detail"] as const,
  byId: (bboxId: number | null | undefined) =>
    queryOptions({
      queryKey: [...bboxQueries.byIdScope(), bboxId] as const,
      queryFn: !bboxId ? skipToken : () => BboxAnnotationService.getById({ bboxId }),
      staleTime: 1000 * 60 * 5,
    }),

  byUserCodeScope: () => [...bboxQueries.all(), "userCode"] as const,
  byUserCode: (codeId: number | null | undefined) =>
    queryOptions({
      queryKey: [...bboxQueries.byUserCodeScope(), codeId] as const,
      queryFn: !codeId ? skipToken : () => BboxAnnotationService.getByUserCode({ codeId }),
    }),

  bySdocScope: () => [...bboxQueries.all(), "sdoc"] as const,
  bySdoc: (sdocId: number | null | undefined, userId: number | null | undefined) =>
    queryOptions({
      queryKey: [...bboxQueries.bySdocScope(), sdocId, userId] as const,
      queryFn: !sdocId || !userId ? skipToken : () => BboxAnnotationService.getBySdocAndUser({ sdocId, userId }),
    }),
};

/**
 * Sentence annotations. The per-sdoc query returns the annotations grouped by sentence
 * (SentenceAnnotatorResult), not a flat list.
 */
const sentenceQueries = {
  all: () => [...annotationRoot(), "sentence"] as const,

  byIdScope: () => [...sentenceQueries.all(), "detail"] as const,
  byId: (sentenceAnnoId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sentenceQueries.byIdScope(), sentenceAnnoId] as const,
      queryFn: !sentenceAnnoId ? skipToken : () => SentenceAnnotationService.getById({ sentenceAnnoId }),
      staleTime: 1000 * 60 * 5,
    }),

  bySdocScope: () => [...sentenceQueries.all(), "sdoc"] as const,
  bySdoc: (sdocId: number | null | undefined, userId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sentenceQueries.bySdocScope(), sdocId, userId] as const,
      queryFn: !sdocId || !userId ? skipToken : () => SentenceAnnotationService.getBySdocAndUser({ sdocId, userId }),
    }),
};

/**
 * Query factory for all annotations. `annotationQueries.all()` matches every annotation query
 * (span, bbox and sentence), e.g. to invalidate them when a code is deleted.
 */
export const annotationQueries = {
  all: annotationRoot,
  span: spanQueries,
  bbox: bboxQueries,
  sentence: sentenceQueries,
};
