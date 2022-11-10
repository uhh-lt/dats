import React, { useRef } from "react";
import { AnnotationDocumentRead, SourceDocumentRead, SpanAnnotationReadResolvedText } from "../../../api/openapi";
import useComputeTokenData from "../../annotation/TextAnnotator/useComputeTokenData";
import SentenceContextMenu, {
  SentenceContextMenuHandle,
} from "../../annotation/SentenceContextMenu/SentenceContextMenu";
import SdocHooks from "../../../api/SdocHooks";
import TextAnnotatorRendererNew from "../../annotation/TextAnnotator/TextAnnotatorRendererNew";

interface AnnotationVisualizerProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead;
  showEntities: boolean;
}

/**
 * Super simple annotation rendering, does not work for overlapping annotations!!!
 */
function TextViewer({ sdoc, adoc, showEntities }: AnnotationVisualizerProps) {
  // local state
  const sentenceContextMenuRef = useRef<SentenceContextMenuHandle>(null);

  // global server state (react-query)
  const sentences = SdocHooks.useGetDocumentSentences(sdoc.id);
  const { tokenData, annotationsPerToken, annotationMap } = useComputeTokenData({
    sdocId: sdoc.id,
    annotationDocumentIds: showEntities ? [adoc.id] : [],
  });

  // ui events
  const handleContextMenu = (event: React.MouseEvent) => {
    if (!annotationsPerToken) return;
    if (!annotationMap) return;
    if (!sentences.data) return;

    // try to find a parent element that has the tok class, we go up 3 levels at maximum
    let token: HTMLElement = event.target as HTMLElement;
    let foundToken = false;
    for (let i = 0; i < 3; i++) {
      if (token && token.classList.contains("tok") && token.childElementCount > 0) {
        foundToken = true;
        break;
      }
      if (token.parentElement) {
        token = token.parentElement;
      } else {
        break;
      }
    }

    // try to find a parent element that has the sentence class, we go up 3 levels at maximum
    let sentenceElement: HTMLElement = event.target as HTMLElement;
    let foundSentence = false;
    for (let i = 0; i < 3; i++) {
      if (sentenceElement && sentenceElement.classList.contains("sentence") && sentenceElement.childElementCount > 0) {
        foundSentence = true;
        break;
      }
      if (sentenceElement.parentElement) {
        sentenceElement = sentenceElement.parentElement;
      } else {
        break;
      }
    }

    if (!foundToken && !foundSentence) return;

    event.preventDefault();

    // get sentence
    let sentence: SpanAnnotationReadResolvedText | undefined = undefined;
    if (foundSentence) {
      const sentenceIndex = parseInt(sentenceElement.getAttribute("data-sentenceid")!);
      sentence = sentenceIndex < sentences.data.length ? sentences.data[sentenceIndex] : undefined;
    }

    // get all annotations that span the clicked token
    let annos: number[] | undefined = undefined;
    if (foundToken) {
      const tokenIndex = parseInt(token.getAttribute("data-tokenid")!);
      annos = annotationsPerToken.get(tokenIndex);
    }

    // open code selector if there are annotations
    if (annos || sentence) {
      // calculate position of the context menu (based on selection end)
      const boundingBox = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        left: boundingBox.left,
        top: boundingBox.top + boundingBox.height,
      };
      sentenceContextMenuRef.current?.open(
        position,
        sentence?.span_text,
        annos ? annos.map((a) => annotationMap.get(a)!) : undefined
      );
    }
  };

  return (
    <>
      <TextAnnotatorRendererNew
        tokenData={tokenData}
        annotationsPerToken={annotationsPerToken}
        annotationMap={annotationMap}
        onContextMenu={handleContextMenu}
        isViewer={true}
        html={sdoc.content}
      />
      <SentenceContextMenu ref={sentenceContextMenuRef} />
    </>
  );
}

export default TextViewer;
