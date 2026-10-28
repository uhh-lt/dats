import { computeSentenceAnnotationLanes } from "@core/annotation";
import { sentenceAnnotationQueries } from "@core/sentence-annotation";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SentenceAnnotatorResult } from "@models/SentenceAnnotatorResult";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export interface UseGetSentenceAnnotator {
  annotatorResult: SentenceAnnotatorResult | undefined;
  sentenceAnnotations: Record<number, SentenceAnnotationRead[]>;
  annotationPositions: Record<number, number>[];
  numPositions: number;
}

/**
 * Fetches sentence annotations for a document and computes a deterministic
 * lane assignment for rendering annotation bars side by side.
 *
 * The backend returns annotations grouped by sentence index, with each
 * annotation duplicated across every sentence it covers. This hook deduplicates
 * them, sorts by (start, end, id), and assigns each annotation the lowest lane
 * that is free for its entire sentence range. The result is a stable,
 * deterministic layout: annotations that start earlier always get lower lanes,
 * regardless of creation order or resize history.
 *
 * When `annotationOverride` is provided (e.g. a preview annotation during a
 * resize drag), the matching annotation in the data is replaced with the
 * override before computing lanes. The returned `sentenceAnnotations` reflect
 * the override, so consumers always see consistent data without applying
 * overrides themselves.
 *
 * @param sdocId - The source document ID
 * @param userId - The user whose annotations to fetch
 * @param annotationOverride - Optional annotation to substitute in the data
 *   before computing lanes (used for live preview during resize drags)
 * @param pendingAnnotations - Optional pending annotations (not yet persisted)
 *   to include in the lane computation (rendered from local state only)
 * @returns The raw annotator result, the (possibly overridden) per-sentence
 *   annotations, per-sentence lane maps (position → annotation ID), and the
 *   maximum lane index used
 */
export function useGetSentenceAnnotator({
  sdocId,
  userId,
  annotationOverride,
  pendingAnnotations,
}: {
  sdocId: number;
  userId: number | undefined;
  annotationOverride?: SentenceAnnotationRead;
  pendingAnnotations?: SentenceAnnotationRead[];
}): UseGetSentenceAnnotator {
  const annotatorResult = useQuery(sentenceAnnotationQueries.bySdoc(sdocId, userId));

  // Three-layer memoization to avoid recomputing lane assignments on every change:
  // 1. Base sentence annotations from server data (rare changes)
  // 2. + pending annotations (rare changes, purely additive)
  // 3. + annotation override (frequent during resize drag, targeted patch)

  // Layer 1: extract base sentence annotations from server data
  const baseSentenceAnnotations = useMemo(() => {
    if (!annotatorResult.data?.sentence_annotations) return undefined;
    const values = Object.values(annotatorResult.data.sentence_annotations);
    return values.length > 0 ? values : undefined;
  }, [annotatorResult.data]);

  // Layer 2: patch pending annotations on top (purely additive, short-circuits when empty)
  const withPendings = useMemo(() => {
    if (!baseSentenceAnnotations) return baseSentenceAnnotations;
    if (!pendingAnnotations || pendingAnnotations.length === 0) return baseSentenceAnnotations;

    const result = baseSentenceAnnotations.map((annotations) => [...annotations]);
    pendingAnnotations.forEach((pending) => {
      for (let i = pending.sentence_id_start; i <= pending.sentence_id_end; i++) {
        if (!result[i]) result[i] = [];
        result[i].push(pending);
      }
    });
    return result;
  }, [baseSentenceAnnotations, pendingAnnotations]);

  // Layer 3: patch the resize override on top (short-circuits when idle)
  const withOverride = useMemo(() => {
    if (!withPendings) return withPendings;
    if (!annotationOverride) return withPendings;

    const override = annotationOverride;
    return withPendings.map((annotations, sentenceIndex) => {
      const coversSentence = override.sentence_id_start <= sentenceIndex && sentenceIndex <= override.sentence_id_end;
      const isListed = annotations.some((a) => a.id === override.id);
      if (coversSentence && !isListed) return [...annotations, override];
      if (!coversSentence && isListed) return annotations.filter((a) => a.id !== override.id);
      if (isListed) return annotations.map((a) => (a.id === override.id ? override : a));
      return annotations;
    });
  }, [withPendings, annotationOverride]);

  // Compute lane assignments from the final sentence annotations
  const {
    sentenceAnnotations: overriddenSentenceAnnotations,
    annotationPositions,
    numPositions,
  } = useMemo(() => {
    if (!withOverride)
      return {
        sentenceAnnotations: {} as Record<number, SentenceAnnotationRead[]>,
        annotationPositions: [],
        numPositions: 0,
      };

    const { annotationPositions, numPositions } = computeSentenceAnnotationLanes(withOverride);

    // build the overridden sentence annotations record (sentence index → annotations)
    const sentenceAnnotationsRecord: Record<number, SentenceAnnotationRead[]> = {};
    withOverride.forEach((annotations, index) => {
      sentenceAnnotationsRecord[index] = annotations;
    });

    return { sentenceAnnotations: sentenceAnnotationsRecord, annotationPositions, numPositions };
  }, [withOverride]);

  return {
    annotatorResult: annotatorResult.data,
    sentenceAnnotations: overriddenSentenceAnnotations,
    annotationPositions,
    numPositions,
  };
}
