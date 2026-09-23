import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import type { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import type { SentenceAnnotatorResult } from "@models/SentenceAnnotatorResult";

// The SDOC_SENTENCE_ANNOTATOR cache groups annotations by sentence index, with
// each annotation duplicated across every sentence it covers. These helpers
// keep that grouped structure in sync when annotations change.

// Insert or replace a sentence annotation in the per-sentence grouped cache,
// adding it to newly covered sentences and removing it from sentences it no
// longer covers.
export function upsertSentenceAnnotation(anno: SentenceAnnotationRead): void {
  queryClient.setQueryData<SentenceAnnotatorResult>(
    [QueryKey.SDOC_SENTENCE_ANNOTATOR, anno.sdoc_id, anno.user_id],
    (old) => {
      if (!old) return old;
      const sentAnnos = { ...old.sentence_annotations };
      Object.keys(sentAnnos).forEach((key) => {
        const sentenceId = Number(key);
        const coversSentence = anno.sentence_id_start <= sentenceId && sentenceId <= anno.sentence_id_end;
        const isListed = sentAnnos[sentenceId].some((a) => a.id === anno.id);
        if (coversSentence && !isListed) {
          sentAnnos[sentenceId] = [...sentAnnos[sentenceId], anno];
        } else if (!coversSentence && isListed) {
          sentAnnos[sentenceId] = sentAnnos[sentenceId].filter((a) => a.id !== anno.id);
        } else if (isListed) {
          sentAnnos[sentenceId] = sentAnnos[sentenceId].map((a) => (a.id === anno.id ? anno : a));
        }
      });
      // Ensure newly covered sentences that had no entry yet are created.
      for (let sentenceId = anno.sentence_id_start; sentenceId <= anno.sentence_id_end; sentenceId++) {
        if (!sentAnnos[sentenceId]) {
          sentAnnos[sentenceId] = [anno];
        }
      }
      return { sentence_annotations: sentAnnos };
    },
  );
}

// Remove a sentence annotation from every sentence bucket in the grouped cache.
export function removeSentenceAnnotation(anno: SentenceAnnotationRead): void {
  queryClient.setQueryData<SentenceAnnotatorResult>(
    [QueryKey.SDOC_SENTENCE_ANNOTATOR, anno.sdoc_id, anno.user_id],
    (old) => {
      if (!old) return old;
      const sentAnnos = { ...old.sentence_annotations };
      for (let sentenceId = anno.sentence_id_start; sentenceId <= anno.sentence_id_end; sentenceId++) {
        if (!sentAnnos[sentenceId]) continue;
        sentAnnos[sentenceId] = sentAnnos[sentenceId].filter((a) => a.id !== anno.id);
      }
      return { sentence_annotations: sentAnnos };
    },
  );
}
