import {
  IToken,
  SdocAudioLink,
  SdocImage,
  SdocVideoLink,
  SpanAnnotationResizeStartHandler,
  Token,
} from "@core/annotation";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { Box, BoxProps } from "@mui/material";
import { DOMNode, Element, HTMLReactParserOptions, domToReact } from "html-react-parser";
import { useAppSelector } from "@store/storeHooks";
import { useCallback, useMemo } from "react";
import { AnnotationRouteAPI } from "../_hooks/annotationRouteAPI";
import { useJumpToSpanAnnotation } from "../_hooks/useJumpToSpanAnnotation";
import { useSpanAnnotationHighlight } from "../_hooks/useSpanAnnotationHighlight";
import { DocumentPage } from "./_components/DocumentPage";
import "./_styles/Annotation.css";

interface DocumentRendererProps {
  html: string;
  tokenData: IToken[] | undefined;
  annotationsPerToken: Map<number, number[]> | undefined;
  annotationMap: Map<number, SpanAnnotationRead> | undefined;
  isViewer: boolean;
  projectId: number;
  onResizeStart?: SpanAnnotationResizeStartHandler;
}

// needs data from useComputeTokenData
export function DocumentRenderer({
  html,
  tokenData,
  annotationsPerToken,
  annotationMap,
  isViewer,
  projectId,
  onResizeStart,
  ...props
}: DocumentRendererProps & BoxProps) {
  // jump to & highlight the selected annotation
  const { selectedAnnotationId } = AnnotationRouteAPI.useSearch();
  useJumpToSpanAnnotation(selectedAnnotationId);
  useSpanAnnotationHighlight(selectedAnnotationId);

  // global client state (redux)
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);

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
              return (
                <Token
                  key={`token-${tokenId}`}
                  token={token}
                  spanAnnotations={spanAnnotations}
                  hiddenCodeIds={hiddenCodeIds}
                  tagStyle={tagStyle}
                  onResizeStart={onResizeStart}
                />
              );
              // fallback case
            } else {
              return domToReact(domNode.children as DOMNode[], options);
            }
          }
        },
      };
      return options;
    }
  }, [
    annotationMap,
    annotationsPerToken,
    tokenData,
    basicProcessingInstructions,
    hiddenCodeIds,
    tagStyle,
    onResizeStart,
  ]);

  return (
    <Box {...props}>
      <DocumentPage html={html} processingInstructions={processingInstructions} />
    </Box>
  );
}
