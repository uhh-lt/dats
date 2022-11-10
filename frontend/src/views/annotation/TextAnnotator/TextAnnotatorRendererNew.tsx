import React, { useMemo } from "react";
import Token from "./Token";
import "./TextAnnotatorRenderer.css";
import { Box, BoxProps } from "@mui/material";
// @ts-ignore
import * as HtmlToReact from "html-to-react";
// @ts-ignore
import { Parser } from "html-to-react";
import { IToken } from "./IToken";
import { SpanAnnotationReadResolved } from "../../../api/openapi";
import SdocImageLink from "./SdocImageLink";

const htmlToReactParser = new Parser();

const isValidNode = function () {
  return true;
};

const processNodeDefinitions = new HtmlToReact.ProcessNodeDefinitions(React);

interface TextAnnotationRendererNewProps {
  html: string;
  tokenData: IToken[] | undefined;
  annotationsPerToken: Map<number, number[]> | undefined;
  annotationMap: Map<number, SpanAnnotationReadResolved> | undefined;
  isViewer: boolean;
}

// needs data from useComputeTokenData
function TextAnnotationRendererNew({
  html,
  tokenData,
  annotationsPerToken,
  annotationMap,
  isViewer,
  ...props
}: TextAnnotationRendererNewProps & BoxProps) {
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
        {
          shouldProcessNode: function (node: any) {
            return node.name === "img";
          },
          processNode: function (node: any, children: any, index: any) {
            if (node.attribs.sdocid) {
              const sdocId = parseInt(node.attribs.sdocid);
              return (
                <SdocImageLink
                  key={`image-link-${sdocId}`}
                  sdocId={sdocId}
                  to={isViewer ? `../search/doc/${sdocId}` : `../annotation/${sdocId}`}
                />
              );
            } else {
              return <img key={`no-image-${index}`} alt="Could not resolve this :(" />;
            }
          },
        },
        {
          shouldProcessNode: function (node: any) {
            return node.name === "sent" && node.attribs.id;
          },
          processNode: function (node: any, children: any, index: any) {
            const sentenceId = parseInt(node.attribs.id);
            return (
              <span
                key={`sentence-${sentenceId}`}
                className={"sentence " + (isViewer ? "hoversentence" : "")}
                data-sentenceid="0"
              >
                {children}
              </span>
            );
          },
        },
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
            if (children.length === 2) {
              if (children[0].type) {
                return (
                  <React.Fragment key={`token-${tokenId}`}>
                    {children[0]}
                    <Token token={token} spanAnnotations={spanAnnotations} />
                  </React.Fragment>
                );
              } else if (children[1].type) {
                return (
                  <React.Fragment key={`token-${tokenId}`}>
                    <Token token={token} spanAnnotations={spanAnnotations} />
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
            return <Token key={`token-${tokenId}`} token={token} spanAnnotations={spanAnnotations} />;
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
  }, [annotationMap, annotationsPerToken, isViewer, tokenData]);

  const renderedTokens = useMemo(() => {
    if (!annotationsPerToken || !tokenData || !annotationMap) {
      return <div>Loading...</div>;
    }
    return htmlToReactParser.parseWithInstructions(html, isValidNode, processingInstructions);
  }, [html, annotationMap, annotationsPerToken, tokenData, processingInstructions]);

  return <Box {...props}>{renderedTokens}</Box>;
}

export default TextAnnotationRendererNew;
