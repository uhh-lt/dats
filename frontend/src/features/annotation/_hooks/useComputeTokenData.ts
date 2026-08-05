import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { useMemo } from "react";
import { IToken } from "../_types/IToken";

export function useTokenData(sdocData: SourceDocumentDataRead): IToken[] | undefined {
  return useMemo(() => {
    if (!sdocData.token_character_offsets) return undefined;

    const offsets = sdocData.token_character_offsets;
    return sdocData.tokens.map((text, index) => ({
      beginChar: offsets[index][0],
      endChar: offsets[index][1],
      index,
      text,
      whitespace: offsets.length > index + 1 && offsets[index + 1][0] - offsets[index][1] > 0,
      newLine: text.split("\n").length - 1,
    }));
  }, [sdocData]);
}

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
  // global server state (react query)
  const annotations = SpanAnnotationHooks.useGetSpanAnnotationsBatch(sdocData.id, userId);

  // computed
  // todo: maybe implement with selector?
  const tokenData = useTokenData(sdocData);

  // annotationMap stores annotationId -> SpanAnnotationRead
  // annotationsPerToken map stores tokenId -> spanAnnotationId[]
  const { annotationMap, annotationsPerToken } = useMemo(() => {
    if (!annotations.data) return { annotationMap: undefined, annotationsPerToken: undefined };
    const spanGroupIdMapping = new Map<number, number>();
    const annotationMap = new Map<number, SpanAnnotationRead>();
    const annotationsPerToken = new Map<number, number[]>();

    const addAnnotation = (selectedAnnotation: SpanAnnotationRead) => {
      const groupIds = selectedAnnotation.group_ids.map((id) => {
        let mapped = spanGroupIdMapping.get(id);
        if (mapped === undefined) {
          mapped = spanGroupIdMapping.size + 1;
          spanGroupIdMapping.set(id, mapped);
        }
        return mapped;
      });
      const annotation: SpanAnnotationRead = {
        ...selectedAnnotation,
        group_ids: groupIds,
      };

      for (let i = annotation.begin_token; i <= annotation.end_token - 1; i++) {
        const tokenAnnotations = annotationsPerToken.get(i) || [];
        tokenAnnotations.push(annotation.id);
        annotationsPerToken.set(i, tokenAnnotations);
      }
      annotationMap.set(annotation.id, annotation);
    };

    annotations.data.forEach((storedAnnotation) => {
      addAnnotation(storedAnnotation.id === annotationOverride?.id ? annotationOverride : storedAnnotation);
    });
    // render pending (not yet persisted) annotations without touching the query cache
    pendingAnnotations?.forEach((pendingAnnotation) => {
      addAnnotation(pendingAnnotation);
    });
    return { annotationMap, annotationsPerToken };
  }, [annotationOverride, pendingAnnotations, annotations.data]);

  return { tokenData, annotationsPerToken, annotationMap };
}
