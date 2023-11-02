import { SearchResultProps } from "../SearchResultProps";
import { DocType, SimSearchSentenceHit } from "../../../../api/openapi";
import { CardProps, Typography } from "@mui/material";
import SdocHooks from "../../../../api/SdocHooks";
import { simSearchColorScale } from "../../utils";
import { useMemo } from "react";
import SearchResultCardBase from "./SearchResultCardBase";

export interface SentenceSimilaritySearchResultCardProps extends SearchResultProps {
  hits: SimSearchSentenceHit[];
}

interface ContextSentence {
  id: number;
  score: number;
  text: string;
}

function SentenceSimilaritySearchResultCard({
  hits,
  sdocId,
  ...props
}: SentenceSimilaritySearchResultCardProps & CardProps) {
  // query (global server state)
  const sdoc = SdocHooks.useGetDocument(sdocId);

  // computed
  const contextSentences: ContextSentence[] = useMemo(() => {
    if (sdoc.data) {
      // mapping of sentence array index to SimSearchSentenceHit
      const myMap = new Map<number, SimSearchSentenceHit>();
      hits.forEach((hit) => {
        myMap.set(hit.sentence_id, hit);
      });

      const contextSentenceIds = new Set<number>();
      Array.from(myMap.keys()).forEach((index) => {
        contextSentenceIds.add(index);
        if (index - 1 >= 0) contextSentenceIds.add(index - 1);
        if (index + 1 < sdoc.data.sentences.length) contextSentenceIds.add(index + 1);
      });

      const result: ContextSentence[] = [];
      sdoc.data.sentences.forEach((sentence, index) => {
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
  }, [sdoc.data, hits]);

  return (
    <SearchResultCardBase
      sdocId={sdocId}
      sx={{ width: "100%" }}
      {...props}
      renderContent={(sdoc) => {
        return (
          <>
            {sdoc.doctype !== DocType.TEXT ? (
              <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
                DOC TYPE {sdoc.doctype} IS NOT SUPPORTED for SentenceSimilaritySearchResultCard :(
              </Typography>
            ) : (
              <Typography sx={{ mb: 1.5, overflow: "hidden", textOverflow: "ellipsis" }} variant="body2">
                {contextSentences.map((sentence) => (
                  <span key={sentence.id}>
                    {sentence.score >= 0 ? (
                      <span
                        style={{
                          textDecoration: "underline",
                          textDecorationColor: simSearchColorScale(sentence.score),
                          textDecorationThickness: "3px",
                        }}
                      >
                        {sentence.text}
                      </span>
                    ) : (
                      <>{sentence.text}</>
                    )}{" "}
                  </span>
                ))}
              </Typography>
            )}
          </>
        );
      }}
    />
  );
}

export default SentenceSimilaritySearchResultCard;
