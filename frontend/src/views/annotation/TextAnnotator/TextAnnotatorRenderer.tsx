import React, { useMemo, useState } from "react";
import Token from "./Token";
import "./TextAnnotatorRenderer.css";
import { SpanAnnotationReadResolved } from "../../../api/openapi";
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
}

const tokensPerPage = 1000;

// needs data from useComputeTokenData
function TextAnnotationRenderer({
  sdocId,
  tokenData,
  annotationsPerToken,
  annotationMap,
  ...props
}: TextAnnotationRendererProps & BoxProps) {
  const tokenCount = tokenData?.length || 0;

  // global client state (redux)
  const tagStyle = useAppSelector((state) => state.settings.annotator.tagStyle);

  // local state
  const [currentPage, setCurrentPage] = useState<number>(0);

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
          currentPage * tokensPerPage,
          currentPage * tokensPerPage + tokensPerPage <= tokenCount
            ? currentPage * tokensPerPage + tokensPerPage
            : tokenCount
        ).map((tokenId) => (
          <Token
            key={tokenId}
            token={tokenData[tokenId]}
            spanAnnotations={(annotationsPerToken.get(tokenId) || []).map(
              (annotationId) => annotationMap.get(annotationId)!
            )}
          />
        ))}
      </>
    );
    console.timeEnd("renderTokens");
    return result;
  }, [annotationsPerToken, tokenData, annotationMap, currentPage, tokenCount]);

  return (
    <Box {...props} style={{ lineHeight: tagStyle === "inline" ? "26px" : "36px" }}>
      <PageNavigation
        elementCount={tokenCount}
        elementsPerPage={tokensPerPage}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
      <Divider />
      {renderedTokens}
      <Divider />
      <PageNavigation
        elementCount={tokenCount}
        elementsPerPage={tokensPerPage}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
    </Box>
  );
}

export default TextAnnotationRenderer;
