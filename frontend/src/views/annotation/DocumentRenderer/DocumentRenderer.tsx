import { Box, BoxProps } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useEffect, useMemo, useRef } from "react";
import "./DocumentRenderer.css";

import { DOMNode, Element, HTMLReactParserOptions, domToReact } from "html-react-parser";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import DocumentPage from "./DocumentPage.tsx";
import { IToken } from "./IToken.ts";
import SdocAudioLink from "./SdocAudioLink.tsx";
import SdocImage from "./SdocImage.tsx";
import SdocVideoLink from "./SdocVideoLink.tsx";
import Token from "./Token.tsx";

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
    if (content.startsWith("<div>")) {
      content = content.substring(5);
    }
    if (content.endsWith("</div>")) {
      content = content.substring(0, content.length - 6);
    }
    content = content.trim();
    const regex = /<section pagenum="\d+">|<\/section><section pagenum="\d+">|<\/section>/gm;
    let splitted = content.split(regex);
    splitted = splitted.filter((s) => s.length > 0);
    return splitted;
  }, [html]);
  const numPages = htmlPages.length;

  // jump to annotations
  const selectedAnnotationId = useAppSelector((state) => state.annotations.selectedAnnotationId);
  useEffect(() => {
    const scrollIntoView = () => {
      const annotation = document.getElementById("span-annotation-" + selectedAnnotationId);
      if (annotation) {
        annotation.scrollIntoView({ behavior: "smooth" });
        return true;
      }
      return false;
    };
    if (!scrollIntoView()) {
      const intervalHandle = setInterval(() => {
        if (scrollIntoView()) {
          clearInterval(intervalHandle);
        }
      }, 500);
    }
  }, [selectedAnnotationId]);

  // virtualization
  const listRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => listRef.current,
    estimateSize: () => 155,
  });

  // Order matters. Instructions are processed in
  // the order they're defined
  const processingInstructions: HTMLReactParserOptions = useMemo(() => {
    if (!annotationsPerToken || !tokenData || !annotationMap) {
      return {
        replace(domNode) {
          if (domNode instanceof Element) {
            return domToReact(domNode.children as DOMNode[], {});
          }
        },
      };
    } else {
      const options: HTMLReactParserOptions = {
        replace(domNode) {
          if (domNode instanceof Element && domNode.attribs) {
            // images
            if (domNode.name === "img" && domNode.attribs.src) {
              const filename = domNode.attribs.src;
              return <SdocImage key={`image-link-${filename}`} filename={filename} projectId={projectId} />;
            }
            //  videos
            else if (domNode.name === "video" && domNode.attribs.src) {
              const filename = domNode.attribs.src;
              return (
                <SdocVideoLink
                  key={`video-link-${filename}`}
                  filename={filename}
                  toPrefix={"../annotation/"}
                  projectId={projectId}
                />
              );
            }
            // audios
            else if (domNode.name === "audio" && domNode.attribs.src) {
              const filename = domNode.attribs.src;
              return (
                <SdocAudioLink
                  key={`audio-link-${filename}`}
                  filename={filename}
                  toPrefix={"../annotation/"}
                  projectId={projectId}
                />
              );
            }
            // sentences
            else if (domNode.name === "sent" && domNode.attribs.id) {
              const sentenceId = parseInt(domNode.attribs.id);
              return (
                <span
                  key={`sentence-${sentenceId}`}
                  className={"sentence " + (isViewer ? "hoversentence " : "")}
                  data-sentenceid={sentenceId}
                >
                  {domToReact(domNode.children as DOMNode[], options)}
                </span>
              );
            }
            // tokens
            else if (domNode.name === "t" && domNode.attribs.id) {
              const tokenId = parseInt(domNode.attribs.id);
              const token = tokenData[tokenId];
              const spanAnnotations = (annotationsPerToken.get(tokenId) || []).map(
                (annotationId) => annotationMap.get(annotationId)!,
              );
              return <Token key={`token-${tokenId}`} token={token} spanAnnotations={spanAnnotations} />;
            } else {
              return domToReact(domNode.children as DOMNode[], processingInstructions);
            }
          }
        },
      };
      return options;
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
