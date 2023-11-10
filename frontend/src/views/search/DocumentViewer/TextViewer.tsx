import React, { useRef } from "react";
import { AnnotationDocumentRead, SourceDocumentWithDataRead } from "../../../api/openapi";
import ImageContextMenu, { ImageContextMenuHandle } from "../../../components/ContextMenu/ImageContextMenu";
import SentenceContextMenu, { SentenceContextMenuHandle } from "../../../components/ContextMenu/SentenceContextMenu";
import TextAnnotatorRendererNew from "../../../features/DocumentRenderer/DocumentRenderer";
import useComputeTokenData from "../../../features/DocumentRenderer/useComputeTokenData";

interface AnnotationVisualizerProps {
  sdoc: SourceDocumentWithDataRead;
  adoc: AnnotationDocumentRead;
  showEntities: boolean;
}

/**
 * Super simple annotation rendering, does not work for overlapping annotations!!!
 */
function TextViewer({ sdoc, adoc, showEntities }: AnnotationVisualizerProps) {
  // local state
  const sentenceContextMenuRef = useRef<SentenceContextMenuHandle>(null);
  const imageContextMenuRef = useRef<ImageContextMenuHandle>(null);

  // global server state (react-query)
  const sentences = sdoc.sentences;
  const { tokenData, annotationsPerToken, annotationMap } = useComputeTokenData({
    sdocId: sdoc.id,
    annotationDocumentIds: showEntities ? [adoc.id] : [],
  });

  // ui events
  const handleContextMenu = (event: React.MouseEvent) => {
    if (!annotationsPerToken) return;
    if (!annotationMap) return;
    if (!sentences) return;

    // try to find a parent element that has the tok class, we go up 3 levels at maximum
    let element: HTMLElement = event.target as HTMLElement;
    let tokenIndex: number = NaN;
    let sentenceIndex: number = NaN;
    let imageSdocId: number = NaN;

    for (let i = 0; i < 3; i++) {
      if (isNaN(imageSdocId)) {
        imageSdocId = parseInt(element.getAttribute("data-sdoc-id")!);
      }
      if (isNaN(sentenceIndex)) {
        sentenceIndex = parseInt(element.getAttribute("data-sentenceid")!);
      }
      if (isNaN(tokenIndex)) {
        tokenIndex = parseInt(element.getAttribute("data-tokenid")!);
      }

      if (!isNaN(imageSdocId)) break;

      // traverse up the tree one element
      if (element.parentElement) {
        element = element.parentElement;
      } else {
        break;
      }
    }

    if (isNaN(tokenIndex) && isNaN(sentenceIndex) && isNaN(imageSdocId)) return;

    event.preventDefault();

    if (!isNaN(imageSdocId)) {
      // calculate position of the context menu
      const position = {
        left: event.clientX,
        top: event.clientY,
      };

      imageContextMenuRef.current?.open(position, imageSdocId);
    } else {
      // calculate position of the context menu (based on selection end)
      const boundingBox = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        left: boundingBox.left,
        top: boundingBox.top + boundingBox.height,
      };

      // get the sentence that spans the clicked element
      let sentence: string | undefined = undefined;
      if (!isNaN(sentenceIndex)) {
        sentence = sentences[sentenceIndex];
      }

      // get all annotations that span the clicked token
      let annos: number[] | undefined = undefined;
      if (!isNaN(tokenIndex)) {
        annos = annotationsPerToken.get(tokenIndex);
      }

      // open code selector if there are annotations
      if (annos || sentence) {
        sentenceContextMenuRef.current?.open(
          position,
          sentence,
          annos ? annos.map((a) => annotationMap.get(a)!) : undefined,
        );
      }
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
        projectId={sdoc.project_id}
        sentences={sentences}
        doHighlighting={true}
        style={{ zIndex: 1, overflowY: "auto" }}
        className="h100"
      />
      <SentenceContextMenu ref={sentenceContextMenuRef} />
      <ImageContextMenu ref={imageContextMenuRef} />
    </>
  );
}

export default TextViewer;
