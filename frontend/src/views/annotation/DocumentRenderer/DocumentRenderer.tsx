import { Box, BoxProps } from "@mui/material";
import { useCallback, useEffect, useMemo } from "react";
import "./DocumentRenderer.css";

import { DOMNode, Element, HTMLReactParserOptions, domToReact } from "html-react-parser";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead.ts";
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
  annotationMap: Map<number, SpanAnnotationRead> | undefined;
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

  const basicProcessingInstructions = useCallback(
    (options: HTMLReactParserOptions) => (domNode: Element) => {
      // links
      if (!isViewer && domNode.name === "a" && domNode.attribs.href) {
        return <>{domToReact(domNode.children as DOMNode[], options)}</>;
      }
      // images
      else if (domNode.name === "img" && domNode.attribs.src) {
        const filename = domNode.attribs.src;
        return <SdocImage key={`image-link-${filename}`} filename={filename} projectId={projectId} />;
      }
      //  videos
      else if (domNode.name === "video" && domNode.attribs.src) {
        const filename = domNode.attribs.src;
        return <SdocVideoLink key={`video-link-${filename}`} filename={filename} projectId={projectId} />;
      }
      // audios
      else if (domNode.name === "audio" && domNode.attribs.src) {
        const filename = domNode.attribs.src;
        return <SdocAudioLink key={`audio-link-${filename}`} filename={filename} projectId={projectId} />;
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
      } else {
        return false;
      }
    },
    [projectId, isViewer],
  );

  // Order matters. Instructions are processed in
  // the order they're defined
  const processingInstructions: HTMLReactParserOptions = useMemo(() => {
    if (!annotationsPerToken || !tokenData || !annotationMap) {
      const options: HTMLReactParserOptions = {
        replace(domNode) {
          if (domNode instanceof Element && domNode.attribs) {
            const basicResult = basicProcessingInstructions(options)(domNode);
            if (basicResult) {
              return basicResult;
              // tokens
            } else if (domNode.name === "t" && domNode.attribs.id) {
              const tokenId = parseInt(domNode.attribs.id);
              return (
                <span data-tokenid={tokenId} className="tok">
                  {domToReact(domNode.children as DOMNode[], options)}
                </span>
              );
              // fallback case
            } else {
              return domToReact(domNode.children as DOMNode[], options);
            }
          }
        },
      };
      return options;
    } else {
      const options: HTMLReactParserOptions = {
        replace(domNode) {
          if (domNode instanceof Element && domNode.attribs) {
            // only basic processing
            const basicResult = basicProcessingInstructions(options)(domNode);
            if (basicResult) {
              return basicResult;
              // tokens
            } else if (domNode.name === "t" && domNode.attribs.id) {
              const tokenId = parseInt(domNode.attribs.id);
              const token = tokenData[tokenId];
              const spanAnnotations = (annotationsPerToken.get(tokenId) || []).map(
                (annotationId) => annotationMap.get(annotationId)!,
              );
              return <Token key={`token-${tokenId}`} token={token} spanAnnotations={spanAnnotations} />;
              // fallback case
            } else {
              return domToReact(domNode.children as DOMNode[], options);
            }
          }
        },
      };
      return options;
    }
  }, [annotationMap, annotationsPerToken, tokenData, basicProcessingInstructions]);

  return (
    <Box {...props}>
      <DocumentPage html={html} processingInstructions={processingInstructions} />
    </Box>
  );
}

export default DocumentRenderer;
