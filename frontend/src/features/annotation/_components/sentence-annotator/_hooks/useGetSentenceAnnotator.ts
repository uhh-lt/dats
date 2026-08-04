import { SentenceAnnotationHooks } from "@api/hooks/SentenceAnnotationHooks";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SentenceAnnotatorResult } from "@models/SentenceAnnotatorResult";
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
 * @returns The raw annotator result, the (possibly overridden) per-sentence
 *   annotations, per-sentence lane maps (position → annotation ID), and the
 *   maximum lane index used
 */
export function useGetSentenceAnnotator({
  sdocId,
  userId,
  annotationOverride,
}: {
  sdocId: number;
  userId: number | undefined;
  annotationOverride?: SentenceAnnotationRead;
}): UseGetSentenceAnnotator {
  const annotatorResult = SentenceAnnotationHooks.useGetSentenceAnnotator(sdocId, userId);
  const {
    sentenceAnnotations: overriddenSentenceAnnotations,
    annotationPositions,
    numPositions,
  } = useMemo(() => {
    if (!annotatorResult.data?.sentence_annotations)
      return {
        sentenceAnnotations: {} as Record<number, SentenceAnnotationRead[]>,
        annotationPositions: [],
        numPositions: 0,
      };
    let sentenceAnnotations = Object.values(annotatorResult.data.sentence_annotations);

    if (sentenceAnnotations.length === 0)
      return {
        sentenceAnnotations: {} as Record<number, SentenceAnnotationRead[]>,
        annotationPositions: [],
        numPositions: 0,
      };

    // apply the annotation override (e.g. preview during resize) so that lane
    // assignment reflects the override's boundaries
    if (annotationOverride) {
      const override = annotationOverride;
      sentenceAnnotations = sentenceAnnotations.map((annotations, sentenceIndex) => {
        const coversSentence = override.sentence_id_start <= sentenceIndex && sentenceIndex <= override.sentence_id_end;
        const isListed = annotations.some((a) => a.id === override.id);
        if (coversSentence && !isListed) return [...annotations, override];
        if (!coversSentence && isListed) return annotations.filter((a) => a.id !== override.id);
        if (isListed) return annotations.map((a) => (a.id === override.id ? override : a));
        return annotations;
      });
    }

    // collect unique annotations (the backend includes each annotation once per covered sentence)
    // and sort them by (start, end, id) so that lane assignment is deterministic:
    // annotations that start earlier always get lower lanes
    const seen = new Set<number>();
    const allAnnotations = sentenceAnnotations.flat().filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
    allAnnotations.sort(
      (a, b) => a.sentence_id_start - b.sentence_id_start || a.sentence_id_end - b.sentence_id_end || a.id - b.id,
    );

    // assign lanes in sorted order: each annotation gets the lowest lane that is free
    // for its entire sentence range
    const laneByAnnotationId = new Map<number, number>();
    // laneEndByLane[lane] = the last sentence index occupied by that lane
    const laneEndByLane: number[] = [];
    for (const annotation of allAnnotations) {
      let lane = 0;
      while (lane < laneEndByLane.length && laneEndByLane[lane] >= annotation.sentence_id_start) {
        lane++;
      }
      laneByAnnotationId.set(annotation.id, lane);
      laneEndByLane[lane] = annotation.sentence_id_end;
    }

    // build per-sentence position maps (key: position, value: annotation id)
    let numPositions = 0;
    const annotationPositions: Record<number, number>[] = sentenceAnnotations.map((annotations) => {
      const positions: Record<number, number> = {};
      for (const annotation of annotations) {
        const lane = laneByAnnotationId.get(annotation.id);
        if (lane !== undefined) {
          positions[lane] = annotation.id;
          if (lane > numPositions) numPositions = lane;
        }
      }
      return positions;
    });

    // build the overridden sentence annotations record (sentence index → annotations)
    const sentenceAnnotationsRecord: Record<number, SentenceAnnotationRead[]> = {};
    sentenceAnnotations.forEach((annotations, index) => {
      sentenceAnnotationsRecord[index] = annotations;
    });

    return { sentenceAnnotations: sentenceAnnotationsRecord, annotationPositions, numPositions };
  }, [annotatorResult.data, annotationOverride]);

  return {
    annotatorResult: annotatorResult.data,
    sentenceAnnotations: overriddenSentenceAnnotations,
    annotationPositions,
    numPositions,
  };
}
