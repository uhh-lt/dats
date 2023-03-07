import { Box, BoxProps } from "@mui/material";
import React, { useEffect, useMemo } from "react";
import "./TextAnnotatorRenderer.css";
import Token from "./Token";
// @ts-ignore
import * as HtmlToReact from "html-to-react";
// @ts-ignore
import { Parser } from "html-to-react";
import { useLocation } from "react-router-dom";
import { SpanAnnotationReadResolved, SpanEntity } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { FilterType, SearchFilter } from "../../search/SearchFilter";
import { SearchActions } from "../../search/searchSlice";
import { IToken } from "./IToken";
import SdocImageLink from "./SdocImageLink";

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
  // Maps the token index to an array of filter IDs that produced a match at that index.
  // (multiple filters might match at the same token index)
  const anchorInfos: Map<number, string[]> = new Map<number, string[]>();
  // information about over which tokens an anchor spans
  const anchorTokenIds: Map<string, number[]> = new Map<string, number[]>();
  // A set of token indices. If an index is in this set, it means that the token at this index should be highlighted
  const highlightSet: Set<number> = new Set<number>();
  if (!tokenData || !filters) {
    return { anchorInfos: undefined, highlightSet: undefined };
  }
  // filter the array of SearchFilters to only contain filters that are searchable in a text document
  const tokenFilters: SearchFilter[] = filters.filter(
    (f) => f.type === FilterType.KEYWORD || f.type === FilterType.TERM || f.type === FilterType.CODE
  );
  // standardize the format of tokens strings to make them better searchable in the document
  const tokenFilterHighlights: string[] = tokenFilters.map((f) =>
    (typeof f.data === "object" ? (f.data as SpanEntity).span_text : (f.data as string)).toLowerCase().trim()
  );
  // An array that keeps track of the number of occurrences of each filter during the search loop
  const filterOccurrences: number[] = new Array<number>(tokenFilterHighlights.length).fill(0);
  // the search loop: Iteratively check for every token position in the text, if any filter
  // in the current list of filters can be found when starting from that position.
  for (let i = 0; i < tokenData.length; i++) {
    // TODO: Only one iteration over the list of tokens necessary
    // traverse all tokens
    const validFilters: (string | undefined)[] = [...tokenFilterHighlights];
    let filterIds: string[] = [];
    let tokenConcats = undefined;
    let newSpanEnd = undefined;
    for (let j = i; j < tokenData.length; j++) {
      let currTok = tokenData[j].text.toLowerCase();
      tokenConcats = !tokenConcats ? currTok : tokenConcats + currTok;
      // check for each filter, if there is a match at this token index in the text.
      for (let k = 0; k < validFilters.length; k++) {
        let filter = validFilters[k];
        if (!!filter) {
          if (filter.startsWith(tokenConcats)) {
            if (filter === tokenConcats) {
              newSpanEnd = j;
              const uniqueFilterId = tokenFilters[k].id.trim() + "-idx" + filterOccurrences[k];
              anchorTokenIds.set(uniqueFilterId, [i, j]);
              filterIds.push(uniqueFilterId);
              filterOccurrences[k] += 1;
              validFilters[k] = undefined;
            }
          } else {
            validFilters[k] = undefined;
          }
        }
      }
      if (validFilters.every((v) => !v)) {
        break;
      } else if (tokenData[j].whitespace) {
        tokenConcats += " ";
      }
    }
    if (newSpanEnd) {
      anchorInfos.set(i, filterIds);
      for (let t = i; t <= newSpanEnd; t++) {
        highlightSet.add(t);
      }
    }
  }
  // create a mapping from filter IDs to the total number of occurrences of each filter (for anchor limits)
  const filterLimits: Map<string, number> = new Map<string, number>();
  tokenFilters.forEach((filter, index) => filterLimits.set(filter.id, filterOccurrences[index]));
  return {
    anchorInfos: anchorInfos,
    anchorTokenIds: anchorTokenIds,
    highlightSet: highlightSet,
    filterLimits: filterLimits,
  };
};

const removePrevJumphighlights = () => {
  const prevSelectedAnchor = document.querySelectorAll(".jumphighlight");
  prevSelectedAnchor.forEach((anchor) => {
    anchor.className = anchor.className.replace("jumphighlight", "filterhighlight");
  });
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
  // FIXME: almost identical filters with trailing whitespaces are saved as individual filters
  const filters = useAppSelector((state) => state.search.filters);
  const dispatch = useAppDispatch();
  const { hash } = useLocation();
  const anchoredSpan: string = decodeURI(hash.substring(1));

  // computed
  const sentIdsHighlighted: number[] = useMemo(() => {
    return getHighlightedSentIds(sentences, filters);
  }, [sentences, filters]);

  const { anchorInfos, highlightSet, anchorTokenIds, filterLimits } = useMemo(() => {
    return getHighlightedTokenSet(tokenData, filters);
  }, [tokenData, filters]);

  // effects
  useEffect(() => {
    if (filterLimits !== undefined) {
      dispatch(SearchActions.setFilterAnchorLimits(Object.fromEntries(filterLimits)));
    }
  }, [filterLimits, dispatch]);

  useEffect(() => {
    // return the last highlight, that was jumped to, to its default highlighting
    if (tokenData && anchorTokenIds) {
      removePrevJumphighlights();
      // apply the special highlighting to an element that was just jumped to
      if (anchoredSpan) {
        const tokenRange = anchorTokenIds.get(anchoredSpan);
        if (tokenRange) {
          for (let i = tokenRange[0]; i <= tokenRange[1]; i++) {
            const token = document.getElementById("token" + i);
            if (token) {
              token.className = token.className.replace("filterhighlight", "jumphighlight");
            }
          }
        }
      }
    }
  }, [anchoredSpan, tokenData, anchorTokenIds]);

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
              highlightCode = "filterhighlight";
            }
            if (children.length === 2) {
              if (children[0].type) {
                result = (
                  <React.Fragment key={`token-${tokenId}`}>
                    {children[0]}
                    <Token token={token} spanAnnotations={spanAnnotations} cssClassnames={highlightCode} />
                  </React.Fragment>
                );
              } else if (children[1].type) {
                result = (
                  <React.Fragment key={`token-${tokenId}`}>
                    <Token token={token} spanAnnotations={spanAnnotations} cssClassnames={highlightCode} />
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
                  cssClassnames={highlightCode}
                />
              );
            }
            if (filters) {
              for (let i = 0; i < filters.length; i++) {
                result = (
                  <span key={`token-${tokenId}-${i}`} id={filters[i]}>
                    {result}
                  </span>
                );
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
