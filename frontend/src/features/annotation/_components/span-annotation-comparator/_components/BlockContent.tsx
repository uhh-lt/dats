import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import parse, { DOMNode, domToReact, Element, HTMLReactParserOptions } from "html-react-parser";
import { memo, useMemo } from "react";
import { IToken } from "../../../_types/IToken";
import { SpanAnnotationResizeStartHandler } from "../../../_hooks/useSpanAnnotationResize";
import { SdocAudioLink } from "../../_components/SdocAudioLink";
import { SdocImage } from "../../_components/SdocImage";
import { SdocVideoLink } from "../../_components/SdocVideoLink";
import { Token } from "../../_components/Token";

interface BlockContentProps {
  html: string;
  tokenData: IToken[] | undefined;
  annotationsPerToken: Map<number, number[]> | undefined;
  annotationMap: Map<number, SpanAnnotationRead> | undefined;
  projectId: number;
  onResizeStart?: SpanAnnotationResizeStartHandler;
}

/**
 * BlockContent renders a single HTML block containing text, sentences, and media elements.
 *
 * It uses `html-react-parser` to parse HTML content dynamically while replacing:
 * - `<sent>` tags with `<span className="sentence">` for interactive sentence borders.
 * - `<t>` tags with `<Token>` components to support highlights and tooltips.
 * - `<a>` tags by recursively rendering their child nodes.
 * - Media tags (`<img>`, `<video>`, `<audio>`) with customized application components.
 */
export const BlockContent = memo(
  ({ html, tokenData, annotationsPerToken, annotationMap, projectId, onResizeStart }: BlockContentProps) => {
    const options = useMemo<HTMLReactParserOptions>(() => {
      const parserOpts: HTMLReactParserOptions = {
        replace(domNode: DOMNode): React.ReactElement | string | null | boolean | object | void {
          if (domNode instanceof Element && domNode.attribs) {
            if (domNode.name === "a" && domNode.attribs.href) {
              return <>{domToReact(domNode.children as DOMNode[], parserOpts)}</>;
            } else if (domNode.name === "img" && domNode.attribs.src) {
              const filename = domNode.attribs.src;
              return <SdocImage key={`image-link-${filename}`} filename={filename} projectId={projectId} />;
            } else if (domNode.name === "video" && domNode.attribs.src) {
              const filename = domNode.attribs.src;
              return <SdocVideoLink key={`video-link-${filename}`} filename={filename} projectId={projectId} />;
            } else if (domNode.name === "audio" && domNode.attribs.src) {
              const filename = domNode.attribs.src;
              return <SdocAudioLink key={`audio-link-${filename}`} filename={filename} projectId={projectId} />;
            } else if (domNode.name === "sent" && domNode.attribs.id) {
              const sentenceId = parseInt(domNode.attribs.id);
              return (
                <span key={`sentence-${sentenceId}`} className="sentence" data-sentenceid={sentenceId}>
                  {domToReact(domNode.children as DOMNode[], parserOpts)}
                </span>
              );
            } else if (domNode.name === "t" && domNode.attribs.id) {
              const tokenId = parseInt(domNode.attribs.id);
              if (!tokenData || !annotationsPerToken || !annotationMap) {
                return (
                  <span data-tokenid={tokenId} className="tok">
                    {domToReact(domNode.children as DOMNode[], parserOpts)}
                  </span>
                );
              }
              const token = tokenData[tokenId];
              const spanAnnotations = (annotationsPerToken.get(tokenId) || []).map(
                (annotationId) => annotationMap.get(annotationId)!,
              );
              return (
                <Token
                  key={`token-${tokenId}`}
                  token={token}
                  spanAnnotations={spanAnnotations}
                  onResizeStart={onResizeStart}
                />
              );
            }
          }
        },
      };
      return parserOpts;
    }, [tokenData, annotationsPerToken, annotationMap, projectId, onResizeStart]);

    const parsed = useMemo(() => {
      return parse(html, options);
    }, [html, options]);

    return <>{parsed}</>;
  },
);

BlockContent.displayName = "BlockContent";
