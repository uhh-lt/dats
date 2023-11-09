import { UseQueryResult } from "@tanstack/react-query";
import { SimSearchSentenceHit, SourceDocumentSentences } from "../../../../api/openapi";
import SdocHooks from "../../../../api/SdocHooks";
import { useMemo } from "react";
import { ContextSentence } from "../../../../utils/GlobalConstants";

interface ContextSentenceProps {
  sdocId: number;
  hits: SimSearchSentenceHit[];
}

export function ContextSentences({ sdocId, hits }: ContextSentenceProps) {
  const sentences = SdocHooks.useGetDocumentSentences(sdocId);
  // computed
  return useMemo(() => {
    if (sentences.data) {
      // mapping of sentence array index to SimSearchSentenceHit
      const myMap = new Map<number, SimSearchSentenceHit>();
      hits.forEach((hit) => {
        myMap.set(hit.sentence_id, hit);
      });

      const contextSentenceIds = new Set<number>();
      Array.from(myMap.keys()).forEach((index) => {
        contextSentenceIds.add(index);
        if (index - 1 >= 0) contextSentenceIds.add(index - 1);
        if (index + 1 < sentences.data.sentences.length) contextSentenceIds.add(index + 1);
      });

      const result: ContextSentence[] = [];
      sentences.data.sentences.forEach((sentence, index) => {
        // check if sentence is a highlighted sentence
        if (myMap.has(index)) {
          result.push({
            id: index,
            score: myMap.get(index)!.score,
            text: sentence,
          });
          // check if sentence is near a highlighted sentence
        } else if (contextSentenceIds.has(index)) {
          result.push({
            id: index,
            score: -1,
            text: sentence,
          });
          // only add empty sentence if it is the first sentence or if the previous sentence was not irrelevant
        } else if (result.length === 0 || result[result.length - 1].score !== -99) {
          result.push({
            id: index,
            score: -99,
            text: "[...]",
          });
        }
      });
      return result;
    }
    return [];
  }, [sentences.data, hits]);
}
