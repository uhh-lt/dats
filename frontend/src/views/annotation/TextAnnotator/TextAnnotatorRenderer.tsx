import React, { useMemo, useRef, useState } from "react";
import Token from "./Token";
import "./TextAnnotatorRenderer.css";
import { SpanAnnotationRead, SpanAnnotationReadResolved } from "../../../api/openapi";
import { IToken } from "./IToken";
import { Box, BoxProps, Divider } from "@mui/material";
import { range } from "lodash";
import PageNavigation from "./PageNavigation";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import Sentence from "./Sentence";
import SentenceContextMenu, { SentenceContextMenuHandle } from "../SentenceContextMenu/SentenceContextMenu";
import SdocHooks from "../../../api/SdocHooks";

interface TextAnnotationRendererProps {
  sdocId: number; // todo: is this necessary???
  tokenData: IToken[] | undefined;
  annotationsPerToken: Map<number, number[]> | undefined;
  annotationMap: Map<number, SpanAnnotationReadResolved> | undefined;
  sentenceSearch: boolean;
}

const sentencesPerPage = 10;

// needs data from useComputeTokenData
function TextAnnotationRenderer({
  sdocId,
  tokenData,
  annotationsPerToken,
  annotationMap,
  sentenceSearch,
  ...props
}: TextAnnotationRendererProps & BoxProps) {
  // global client state (redux)
  const tagStyle = useAppSelector((state) => state.settings.annotator.tagStyle);

  // global server state (react-query)
  const sentences = SdocHooks.useGetDocumentSentences(sdocId);

  // local state
  const [currentPage, setCurrentPage] = useState<number>(0);
  const sentenceContextMenuRef = useRef<SentenceContextMenuHandle>(null);

  // computed
  const sentenceCount = sentences.data?.length || 0;

  // ui events
  const onPageChange = (event: React.MouseEvent<HTMLButtonElement>, newPage: number) => {
    setCurrentPage(newPage);
  };

  // rendering
  const renderedTokens = useMemo(() => {
    if (!annotationsPerToken || !tokenData || !annotationMap || !sentences.data) {
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
          <Sentence
            key={sentenceId}
            sentenceMenuRef={sentenceContextMenuRef}
            disableHighlighting={!sentenceSearch}
            disableInteraction={!sentenceSearch}
          >
            {range(sentences.data[sentenceId].begin_token, sentences.data[sentenceId].end_token).map((tokenId) => (
              <Token
                key={tokenId}
                token={tokenData[tokenId]}
                spanAnnotations={(annotationsPerToken.get(tokenId) || []).map(
                  (annotationId) => annotationMap.get(annotationId)!
                )}
              />
            ))}
          </Sentence>
        ))}
      </>
    );
    console.timeEnd("renderTokens");
    return result;
  }, [annotationsPerToken, tokenData, annotationMap, sentences.data, currentPage, sentenceCount, sentenceSearch]);

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
      {sentenceSearch && <SentenceContextMenu ref={sentenceContextMenuRef} />}
    </Box>
  );
}

export default TextAnnotationRenderer;
