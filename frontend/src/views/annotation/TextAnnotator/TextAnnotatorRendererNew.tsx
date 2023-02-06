import React, { useMemo } from "react";
import Token from "./Token";
import "./TextAnnotatorRenderer.css";
import { Box, BoxProps } from "@mui/material";
// @ts-ignore
import * as HtmlToReact from "html-to-react";
// @ts-ignore
import { Parser } from "html-to-react";
import { IToken } from "./IToken";
import { SpanAnnotationReadResolved, SpanEntity } from "../../../api/openapi";
import SdocImageLink from "./SdocImageLink";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { useLocation } from "react-router-dom";
import { FilterType, SearchFilter } from "../../search/SearchFilter";
import { SearchActions } from "../../search/searchSlice";

const htmlToReactParser = new Parser();

const isValidNode = function () {
  return true;
};

const processNodeDefinitions = new HtmlToReact.ProcessNodeDefinitions(React);

interface TextAnnotationRendererNewProps {
  html: string;
  tokenData: IToken[] | undefined;
  sentences: string[] | undefined;
  annotationsPerToken: Map<number, number[]> | undefined;
  annotationMap: Map<number, SpanAnnotationReadResolved> | undefined;
  isViewer: boolean;
  projectId: number;
}

const stripTokenFormatting = (tokens: string) => {
  return tokens
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    .toLowerCase()
    .split(/\s+/);
};

const getHighlightedSentIds = (sentences: string[] | undefined, filters: SearchFilter[]) => {
  if (!sentences || !filters) {
    return [];
  }
  const sentFilterHighlights = filters.filter((f) => f.type === FilterType.SENTENCE).map((f) => f.data as string);
  return sentences
    .map((sent, index) => index)
    .filter((idx) => sentFilterHighlights.some((filter) => sentences[idx].includes(filter)));
};

const getHighlightedTokenSet = (tokenData: IToken[] | undefined, filters: SearchFilter[]) => {
  const anchorInfos: Map<number, string[]> = new Map<number, string[]>();
  const highlightSet: Set<number> = new Set<number>();
  if (!tokenData || !filters) {
    return { anchorInfos: undefined, highlightSet: undefined };
  }
  const tokenFilters: SearchFilter[] = filters.filter(
    (f) => f.type === FilterType.KEYWORD || f.type === FilterType.TERM || f.type === FilterType.CODE
  );
  const tokenFilterHighlights: string[][] = tokenFilters.map((f) =>
    stripTokenFormatting(typeof f.data === "object" ? (f.data as SpanEntity).span_text : (f.data as string))
  );
  const filterOccurrences: number[] = new Array<number>(tokenFilterHighlights.length).fill(0);
  for (let i = 0; i < tokenData.length; i++) {
    let currTok = tokenData[i].text.toLowerCase();
    let filterIds: string[] = [];
    let newSpanEnd = undefined;
    for (let j = 0; j < tokenFilterHighlights.length; j++) {
      let filter = tokenFilterHighlights[j];
      if (filter[0] === currTok) {
        if (filter.length > 1) {
          let match = true;
          let tokenIdx = i;
          for (let k = 1; k < filter.length; k++) {
            tokenIdx = i + k;
            let filterToken = filter[k];
            if (filterToken !== tokenData[tokenIdx].text.toLowerCase()) {
              match = false;
              break;
            }
          }
          if (match) {
            if (!newSpanEnd || tokenIdx > newSpanEnd) {
              newSpanEnd = tokenIdx;
            }
            filterIds.push(tokenFilters[j].id + filterOccurrences[j]);
            filterOccurrences[j] += 1;
          }
        } else {
          if (!newSpanEnd) {
            newSpanEnd = i;
          }
          filterIds.push(tokenFilters[j].id + filterOccurrences[j]);
          filterOccurrences[j] += 1;
        }
      }
    }
    if (newSpanEnd) {
      anchorInfos.set(i, filterIds);
      for (let j = i; j <= newSpanEnd; j++) {
        highlightSet.add(j);
      }
    }
    if (!tokenData[i].whitespace) {
      i++;
    }
  }
  return { anchorInfos: anchorInfos, highlightSet: highlightSet, filterOccurrences: filterOccurrences };
};

// needs data from useComputeTokenData
function TextAnnotationRendererNew({
  html,
  tokenData,
  sentences,
  annotationsPerToken,
  annotationMap,
  isViewer,
  projectId,
  ...props
}: TextAnnotationRendererNewProps & BoxProps) {
  const filters = useAppSelector((state) => state.search.filters);
  const dispatch = useAppDispatch();
  const { hash } = useLocation();
  const anchoredSpan: string = hash.substring(1);

  const sentIdsHighlighted: number[] = useMemo(() => {
    return getHighlightedSentIds(sentences, filters);
  }, [sentences, filters]);
  const { anchorInfos, highlightSet } = useMemo(() => {
    const result = getHighlightedTokenSet(tokenData, filters);
    if (result.filterOccurrences !== undefined) {
      dispatch(SearchActions.setFilterAnchorLimits(result.filterOccurrences));
    }
    return { anchorInfos: result.anchorInfos, highlightSet: result.highlightSet };
  }, [tokenData, filters, dispatch]);

  // Order matters. Instructions are processed in
  // the order they're defined
  const processingInstructions = useMemo(() => {
    if (!annotationsPerToken || !tokenData || !annotationMap) {
      return [
        {
          // Anything else
          shouldProcessNode: function (node: any) {
            return true;
          },
          processNode: processNodeDefinitions.processDefaultNode,
        },
      ];
    } else {
      return [
        // processing of images
        {
          shouldProcessNode: function (node: any) {
            return node.name === "img";
          },
          processNode: function (node: any, children: any, index: any) {
            if (node.attribs.src) {
              const filename = node.attribs.src;
              return (
                <SdocImageLink
                  key={`image-link-${filename}`}
                  filename={filename}
                  toPrefix={isViewer ? `../search/doc/` : `../annotation/`}
                  projectId={projectId}
                />
              );
            }
          },
        },
        // processing of sentences
        {
          shouldProcessNode: function (node: any) {
            return node.name === "sent" && node.attribs.id;
          },
          processNode: function (node: any, children: any, index: any) {
            const sentenceId = parseInt(node.attribs.id);
            return (
              <span
                key={`sentence-${sentenceId}`}
                className={
                  "sentence " +
                  (isViewer ? "hoversentence " : "") +
                  (sentIdsHighlighted.includes(sentenceId) ? "filterhighlight" : "")
                }
                data-sentenceid={sentenceId}
              >
                {children}
              </span>
            );
          },
        },
        // processing of tokens
        {
          shouldProcessNode: function (node: any) {
            return node.name === "t";
          },
          processNode: function (node: any, children: any, index: any) {
            const tokenId = parseInt(node.attribs.id);
            const token = tokenData[tokenId];
            const spanAnnotations = (annotationsPerToken.get(tokenId) || []).map(
              (annotationId) => annotationMap.get(annotationId)!
            );
            const filters = anchorInfos?.get(tokenId);
            let result = undefined;
            let highlightCode: string = "";
            if (highlightSet?.has(tokenId)) {
              if (filters && filters.some((f) => f === anchoredSpan)) {
                highlightCode = "jumphighlight";
              } else {
                highlightCode = "filterhighlight";
              }
            }
            if (children.length === 2) {
              if (children[0].type) {
                result = (
                  <React.Fragment key={`token-${tokenId}`}>
                    {children[0]}
                    <Token token={token} spanAnnotations={spanAnnotations} filterHighlight={highlightCode} />
                  </React.Fragment>
                );
              } else if (children[1].type) {
                result = (
                  <React.Fragment key={`token-${tokenId}`}>
                    <Token token={token} spanAnnotations={spanAnnotations} filterHighlight={highlightCode} />
                    {children[1]}
                  </React.Fragment>
                );
              } else {
                console.log(children);
                console.error("THIS IS BUGGED!");
              }
            } else if (children.length > 2) {
              console.log(children);
              console.error("THIS IS BUGGED 2!");
            }
            if (!result) {
              result = (
                <Token
                  key={`token-${tokenId}`}
                  token={token}
                  spanAnnotations={spanAnnotations}
                  filterHighlight={highlightCode}
                />
              );
            }
            if (filters) {
              for (let i = 0; i < filters.length; i++) {
                result = <span id={filters[i]}>{result}</span>;
              }
            }
            return result;
          },
        },
        {
          // Anything else
          shouldProcessNode: function (node: any) {
            return true;
          },
          processNode: processNodeDefinitions.processDefaultNode,
        },
      ];
    }
  }, [
    anchorInfos,
    annotationMap,
    annotationsPerToken,
    anchoredSpan,
    highlightSet,
    isViewer,
    projectId,
    sentIdsHighlighted,
    tokenData,
  ]);

  const renderedTokens = useMemo(() => {
    if (!annotationsPerToken || !tokenData || !annotationMap) {
      return <div>Loading...</div>;
    }
    return htmlToReactParser.parseWithInstructions(html, isValidNode, processingInstructions);
  }, [html, annotationMap, annotationsPerToken, tokenData, processingInstructions]);

  return <Box {...props}>{renderedTokens}</Box>;
}

export default TextAnnotationRendererNew;
