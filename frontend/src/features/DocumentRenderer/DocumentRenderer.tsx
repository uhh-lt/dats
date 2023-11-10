import { Box, BoxProps } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo, useRef } from "react";
import "./DocumentRenderer.css";
// @ts-ignore
import * as HtmlToReact from "html-to-react";
import { SpanAnnotationReadResolved } from "../../api/openapi";
import DocumentPage from "./DocumentPage";
import { IToken } from "./IToken";
import SdocAudioLink from "./SdocAudioLink";
import SdocImageLink from "./SdocImageLink";
import SdocVideoLink from "./SdocVideoLink";
import Token from "./Token";

const processNodeDefinitions = new HtmlToReact.ProcessNodeDefinitions(React);

interface DocumentRendererProps {
  html: string;
  tokenData: IToken[] | undefined;
  annotationsPerToken: Map<number, number[]> | undefined;
  annotationMap: Map<number, SpanAnnotationReadResolved> | undefined;
  isViewer: boolean;
  projectId: number;
}

// needs data from useComputeTokenData
function DocumentRenderer({
  html,
  tokenData,
  annotationsPerToken,
  annotationMap,
  isViewer,
  projectId,
  ...props
}: DocumentRendererProps & BoxProps) {
  // computed
  const htmlPages = useMemo(() => {
    let content = html;
    console.log("content", content);
    if (content.startsWith("<div>")) {
      content = content.substring(5);
    }
    if (content.endsWith("</div>")) {
      content = content.substring(0, content.length - 6);
    }
    content = content.trim();
    const regex = /<page num="\d+">|<\/page><page num="\d+">|<\/page>/gm;
    let splitted = content.split(regex);
    splitted = splitted.filter((s) => s.length > 0);
    return splitted;
  }, [html]);
  const numPages = htmlPages.length;

  // virtualization
  const listRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => listRef.current,
    estimateSize: () => 155,
    overscan: 1,
  });

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
        // processing of videos
        {
          shouldProcessNode: function (node: any) {
            return node.name === "video";
          },
          processNode: function (node: any, children: any[], index: any) {
            let filename = undefined;
            // check if node has a src attribute
            if (node && node.attribs && node.attribs.src) {
              filename = node.attribs.src;
            } else {
              // check if node has a source child with a src attribute
              let source = children.find((child) => child.type === "source");
              if (source && source.props.hasOwnProperty("src")) {
                filename = source.props.src;
              }
            }
            // if a filename was found, create a link to the video
            if (filename) {
              return (
                <SdocVideoLink
                  key={`video-link-${filename}`}
                  filename={filename}
                  toPrefix={isViewer ? `../search/doc/` : `../annotation/`}
                  projectId={projectId}
                />
              );
            }
          },
        },
        // processing of audios
        {
          shouldProcessNode: function (node: any) {
            return node.name === "audio";
          },
          processNode: function (node: any, children: any[], index: any) {
            let filename = undefined;
            // check if node has a src attribute
            if (node && node.attribs && node.attribs.src) {
              filename = node.attribs.src;
            } else {
              // check if node has a source child with a src attribute
              let source = children.find((child) => child.type === "source");
              if (source && source.props.hasOwnProperty("src")) {
                filename = source.props.src;
              }
            }
            // if a filename was found, create a link to the video
            if (filename) {
              return (
                <SdocAudioLink
                  key={`audio-link-${filename}`}
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
                className={"sentence " + (isViewer ? "hoversentence " : "")}
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
              (annotationId) => annotationMap.get(annotationId)!,
            );
            let result = undefined;
            if (children.length === 2) {
              if (children[0].type) {
                result = (
                  <React.Fragment key={`token-${tokenId}`}>
                    {children[0]}
                    <Token token={token} spanAnnotations={spanAnnotations} />
                  </React.Fragment>
                );
              } else if (children[1].type) {
                result = (
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
            if (!result) {
              result = <Token key={`token-${tokenId}`} token={token} spanAnnotations={spanAnnotations} />;
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
  }, [annotationMap, annotationsPerToken, isViewer, projectId, tokenData]);

  return (
    <Box ref={listRef} {...props}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            ref={virtualizer.measureElement}
            data-index={virtualItem.index}
            style={{
              width: "100%",
              padding: 5,
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <DocumentPage html={htmlPages[virtualItem.index]} processingInstructions={processingInstructions} />
          </div>
        ))}
      </div>
    </Box>
  );
}

export default DocumentRenderer;
