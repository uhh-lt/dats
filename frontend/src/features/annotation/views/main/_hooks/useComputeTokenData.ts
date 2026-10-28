import { computeSpanAnnotationMaps, useTokenData } from "@core/annotation";
import { spanAnnotationQueries } from "@core/span-annotation";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Builds the token and annotation lookup data used by the text annotation renderers.
 *
 * The hook loads one user's span annotations for the supplied source document and
 * derives two lookup maps: annotations by ID and annotation IDs by token. Span-group
 * IDs are mapped to compact, document-local numbers for consistent coreference colors.
 * When an annotation is being resized, `annotationOverride` temporarily replaces the
 * matching server annotation in these derived maps without modifying the query cache.
 *
 * @param sdocData The source document data containing tokens and their character offsets.
 * @param userId The user whose span annotations should be loaded. The query remains disabled when no user ID is set.
 * @param annotationOverride An optional temporary annotation state used to render a live resize preview.
 * @param pendingAnnotations Optional not-yet-persisted annotations (e.g. while the user picks a code, or
 *   while a create mutation is in flight) that are rendered without being written to the query cache.
 * @returns Token metadata, a token-to-annotation-ID map, and an annotation-ID-to-annotation map.
 */
export function useComputeTokenData({
  sdocData,
  userId,
  annotationOverride,
  pendingAnnotations,
}: {
  sdocData: SourceDocumentDataRead;
  userId: number | null | undefined;
  annotationOverride?: SpanAnnotationRead;
  pendingAnnotations?: SpanAnnotationRead[];
}) {
  const annotations = useQuery(spanAnnotationQueries.bySdoc(sdocData.id, userId));
  const tokenData = useTokenData(sdocData);

  // Three-layer memoization to avoid rebuilding the full maps on every mousemove during resize:
  // 1. Base maps from server data (rare changes)
  // 2. + pending annotations (rare changes, purely additive)
  // 3. + annotation override (frequent during resize drag, targeted patch)

  // Layer 1: base maps from server data only
  const baseMaps = useMemo(() => {
    if (!annotations.data) return { annotationMap: undefined, annotationsPerToken: undefined };
    return computeSpanAnnotationMaps(annotations.data);
  }, [annotations.data]);

  // Layer 2: patch pending annotations on top (purely additive, short-circuits when empty)
  const withPendings = useMemo(() => {
    if (!baseMaps.annotationMap || !baseMaps.annotationsPerToken) return baseMaps;
    if (!pendingAnnotations || pendingAnnotations.length === 0) return baseMaps;

    const annotationMap = new Map(baseMaps.annotationMap);
    const annotationsPerToken = new Map(baseMaps.annotationsPerToken);

    pendingAnnotations.forEach((pending) => {
      annotationMap.set(pending.id, pending);
      for (let i = pending.begin_token; i <= pending.end_token - 1; i++) {
        const existing = annotationsPerToken.get(i) || [];
        annotationsPerToken.set(i, [...existing, pending.id]);
      }
    });
    return { annotationMap, annotationsPerToken };
  }, [baseMaps, pendingAnnotations]);

  // Layer 3: patch the resize override on top (short-circuits when idle)
  const { annotationMap, annotationsPerToken } = useMemo(() => {
    if (!withPendings.annotationMap || !withPendings.annotationsPerToken) return withPendings;
    if (!annotationOverride) return withPendings;

    const original = withPendings.annotationMap.get(annotationOverride.id);
    if (!original) return withPendings;

    const annotationMap = new Map(withPendings.annotationMap);
    const annotationsPerToken = new Map(withPendings.annotationsPerToken);

    // remove old token entries
    for (let i = original.begin_token; i <= original.end_token - 1; i++) {
      const existing = annotationsPerToken.get(i);
      if (existing) {
        annotationsPerToken.set(
          i,
          existing.filter((id) => id !== original.id),
        );
      }
    }
    // add new token entries
    for (let i = annotationOverride.begin_token; i <= annotationOverride.end_token - 1; i++) {
      const existing = annotationsPerToken.get(i) || [];
      annotationsPerToken.set(i, [...existing, annotationOverride.id]);
    }
    annotationMap.set(annotationOverride.id, annotationOverride);
    return { annotationMap, annotationsPerToken };
  }, [withPendings, annotationOverride]);

  return { tokenData, annotationsPerToken, annotationMap };
}
