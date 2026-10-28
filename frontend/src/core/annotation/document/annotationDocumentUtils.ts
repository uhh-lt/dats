import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";

/**
 * Builds the lookup maps the span annotation renderers need: the annotations by ID and the
 * annotation IDs by token. Span-group IDs are mapped to compact numbers (in order of appearance)
 * for consistent coreference colors.
 */
export function computeSpanAnnotationMaps(annotations: SpanAnnotationRead[]) {
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

  annotations.forEach(addAnnotation);
  return { annotationMap, annotationsPerToken };
}

/**
 * Assigns every sentence annotation a lane for rendering the annotation bars side by side.
 *
 * The annotations are deduplicated (the backend lists each annotation once per covered sentence),
 * sorted by (start, end, id), and each gets the lowest lane that is free for its entire sentence
 * range. The layout is deterministic: annotations that start earlier always get lower lanes,
 * regardless of creation order or resize history.
 *
 * @param annotationsBySentence The annotations of every sentence (index = sentence id).
 * @returns Per-sentence lane maps (lane → annotation ID) and the highest lane used.
 */
export function computeSentenceAnnotationLanes(annotationsBySentence: SentenceAnnotationRead[][]) {
  // collect unique annotations and sort them by (start, end, id)
  const seen = new Set<number>();
  const allAnnotations = annotationsBySentence.flat().filter((a) => {
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
  const annotationPositions: Record<number, number>[] = annotationsBySentence.map((annotations) => {
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

  return { annotationPositions, numPositions };
}
