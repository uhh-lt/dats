import React, { useMemo, useState } from "react";
import Token from "./Token";
import "./TextAnnotatorRenderer.css";
import { SpanAnnotationReadResolved, SpanAnnotationReadResolvedText } from "../../../api/openapi";
import { IToken } from "./IToken";
import { Box, BoxProps, Divider } from "@mui/material";
import { range } from "lodash";
import PageNavigation from "./PageNavigation";
import { useAppSelector } from "../../../plugins/ReduxHooks";

interface TextAnnotationRendererProps {
  sdocId: number; // todo: is this necessary???
  tokenData: IToken[] | undefined;
  annotationsPerToken: Map<number, number[]> | undefined;
  annotationMap: Map<number, SpanAnnotationReadResolved> | undefined;
  sentences: SpanAnnotationReadResolvedText[];
  hoverSentences: boolean;
}

const sentencesPerPage = 10;

// needs data from useComputeTokenData
function TextAnnotationRenderer({
  sdocId,
  tokenData,
  annotationsPerToken,
  annotationMap,
  sentences,
  hoverSentences,
  ...props
}: TextAnnotationRendererProps & BoxProps) {
  // global client state (redux)
  const tagStyle = useAppSelector((state) => state.settings.annotator.tagStyle);

  // local state
  const [currentPage, setCurrentPage] = useState<number>(0);

  // computed
  const sentenceCount = sentences.length;

  // ui events
  const onPageChange = (event: React.MouseEvent<HTMLButtonElement>, newPage: number) => {
    setCurrentPage(newPage);
  };

  // rendering
  const renderedTokens = useMemo(() => {
    if (!annotationsPerToken || !tokenData || !annotationMap) {
      return <div>Loading...</div>;
    }

    console.time("renderTokens");
    const result = (
      <>
        {range(
          currentPage * sentencesPerPage,
          currentPage * sentencesPerPage + sentencesPerPage <= sentenceCount
            ? currentPage * sentencesPerPage + sentencesPerPage
            : sentenceCount
        ).map((sentenceId) => (
          <span
            key={sentenceId}
            className={"sentence " + (hoverSentences ? "hoversentence" : "")}
            data-sentenceid={sentenceId}
          >
            {range(sentences[sentenceId].begin_token, sentences[sentenceId].end_token).map((tokenId) => (
              <Token
                key={tokenId}
                token={tokenData[tokenId]}
                spanAnnotations={(annotationsPerToken.get(tokenId) || []).map(
                  (annotationId) => annotationMap.get(annotationId)!
                )}
              />
            ))}
          </span>
        ))}
      </>
    );
    console.timeEnd("renderTokens");
    return result;
  }, [annotationsPerToken, tokenData, annotationMap, sentences, currentPage, sentenceCount, hoverSentences]);

  return (
    <Box {...props} style={{ lineHeight: tagStyle === "inline" ? "26px" : "36px" }}>
      <PageNavigation
        elementCount={sentenceCount}
        elementsPerPage={sentencesPerPage}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
      <Divider />
      {renderedTokens}
      <Divider />
      <PageNavigation
        elementCount={sentenceCount}
        elementsPerPage={sentencesPerPage}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
    </Box>
  );
}

export default TextAnnotationRenderer;
