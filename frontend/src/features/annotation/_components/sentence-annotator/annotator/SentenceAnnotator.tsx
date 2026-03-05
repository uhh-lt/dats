import { CodeHooks } from "@api/hooks/CodeHooks";
import { SentenceAnnotationRead } from "@api/models/SentenceAnnotationRead";
import { SourceDocumentDataRead } from "@api/models/SourceDocumentDataRead";
import { Box, BoxProps } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useMemo, useRef, useState } from "react";

import { SentenceAnnotationHooks } from "@api/hooks/SentenceAnnotationHooks";
import { AnnotationRouteAPI } from "../../../_hooks/annotationRouteAPI";
import { Annotation } from "../../../_types/Annotation";
import { AnnoActions } from "../../../store/annoSlice";
import { AnnotationMenu, AnnotationMenuHandle } from "../../annotation-menu";
import { useGetSentenceAnnotator } from "../_hooks/useGetSentenceAnnotator";
import { DocumentSentence } from "./_components/DocumentSentence";

interface SentenceAnnotatorProps {
  sdocData: SourceDocumentDataRead;
  virtualizerScrollElementRef: React.RefObject<HTMLDivElement>;
}

export const SentenceAnnotator = memo(
  ({ sdocData, virtualizerScrollElementRef, ...props }: SentenceAnnotatorProps & BoxProps) => {
    // global client state (URL search params)
    const { visibleUserId, selectedAnnotationId } = AnnotationRouteAPI.useSearch();

    // global server state (react-query)
    const codeMap = CodeHooks.useGetAllCodesMap();
    const annotator = useGetSentenceAnnotator({ sdocId: sdocData.id, userId: visibleUserId });

    // selection
    const mostRecentCodeId = useAppSelector((state) => state.annotations.mostRecentCodeId);
    const [selectedSentences, setSelectedSentences] = useState<number[]>([]);
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // highlighting
    const hoveredCodeId = useAppSelector((state) => state.annotations.hoveredCodeId);
    const [hoverSentAnnoId, setHoverSentAnnoId] = useState<number | null>(null);

    // annotation menu
    const annotationMenuRef = useRef<AnnotationMenuHandle>(null);
    const dispatch = useAppDispatch();
    const createMutation = SentenceAnnotationHooks.useCreateSentenceAnnotation();
    const deleteMutation = SentenceAnnotationHooks.useDeleteSentenceAnnotation();
    const updateMutation = SentenceAnnotationHooks.useUpdateSentenceAnnotation();
    const handleCodeSelectorDeleteAnnotation = (annotation: Annotation) => {
      deleteMutation.mutate(annotation as SentenceAnnotationRead);
    };
    const handleCodeSelectorEditCode = (annotation: Annotation, codeId: number) => {
      updateMutation.mutate({
        sentenceAnnoToUpdate: annotation as SentenceAnnotationRead,
        update: {
          code_id: codeId,
        },
      });
    };
    const handleCodeSelectorAddCode = (codeId: number, isNewCode: boolean) => {
      setSelectedSentences([]);
      setLastClickedIndex(null);
      createMutation.mutate(
        {
          requestBody: {
            code_id: codeId,
            sdoc_id: sdocData.id,
            sentence_id_start: selectedSentences[0],
            sentence_id_end: selectedSentences[selectedSentences.length - 1],
          },
        },
        {
          onSuccess: () => {
            if (!isNewCode) {
              // if we use an existing code to annotate, we move it to the top
              dispatch(AnnoActions.moveCodeToTop(codeId));
            }
          },
        },
      );
    };
    const handleCodeSelectorClose = (reason?: "backdropClick" | "escapeKeyDown") => {
      // i clicked away because i like the annotation as is
      if (selectedSentences.length > 0 && reason === "backdropClick" && mostRecentCodeId) {
        createMutation.mutate({
          requestBody: {
            code_id: mostRecentCodeId,
            sdoc_id: sdocData.id,
            sentence_id_start: selectedSentences[0],
            sentence_id_end: selectedSentences[selectedSentences.length - 1],
          },
        });
      }
      // i clicked escape because i want to cancel the annotation
      if (reason === "escapeKeyDown") {
        console.log("cancel annotation");
      }

      setSelectedSentences([]);
      setLastClickedIndex(null);
      setHoverSentAnnoId(null);
    };

    // event handlers
    const handleAnnotationClick = (
      event: React.MouseEvent<HTMLDivElement, MouseEvent>,
      sentAnnoId: number,
      sentenceIdx: number,
    ) => {
      if (!annotator.annotatorResult) return;

      // annotation to display
      const annotation = annotator.annotatorResult.sentence_annotations[sentenceIdx].find(
        (sentAnno) => sentAnno.id === sentAnnoId,
      );

      if (!annotation) {
        console.error(`Annotation with id ${sentAnnoId} not found.`);
        return;
      }

      // highlight annotation
      setHoverSentAnnoId(sentAnnoId);

      // open code selector
      const target: HTMLElement = event.target as HTMLElement;
      const boundingBox = target.getBoundingClientRect();
      const position = {
        left: boundingBox.left,
        top: boundingBox.top + boundingBox.height,
      };
      annotationMenuRef.current!.open(position, [annotation]);
    };

    const handleAnnotationMouseEnter = (sentAnnoId: number) => {
      setHoverSentAnnoId(sentAnnoId);
    };

    const handleAnnotationMouseLeave = () => {
      // keep the annotation highlighted if the annotation menu is open
      if (annotationMenuRef.current!.isOpen) {
        return;
      }
      setHoverSentAnnoId(null);
    };

    const handleSentenceMouseDown = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {
      // only allow left click
      if (event.button !== 0) {
        return;
      }
      setIsDragging(true);
      setSelectedSentences((selectedSentences) => {
        if (selectedSentences.includes(index)) {
          return [];
        }
        return [index];
      });
      setLastClickedIndex((lastClickedIndex) => (lastClickedIndex === index ? null : index));
    };

    const handleMouseUp = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      setIsDragging(false);
      if (selectedSentences.length === 0) {
        return;
      }

      // ensure that event.target contains the attribute data-sent-id (and therefore is a sentence)
      if (!(event.target as HTMLElement).hasAttribute("data-sent-id")) {
        return;
      }

      // open annotation menu
      const target: HTMLElement = event.target as HTMLElement;
      const boundingBox = target.getBoundingClientRect();
      const position = {
        left: boundingBox.left,
        top: boundingBox.top + boundingBox.height,
      };
      annotationMenuRef.current!.open(position);
    };

    const handleSentenceMouseEnter = (_: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {
      if (lastClickedIndex === null) return;

      if (isDragging) {
        setSelectedSentences(() => {
          const start = Math.min(lastClickedIndex, index);
          const end = Math.max(lastClickedIndex, index);
          const newSelectedSentences: number[] = [];
          for (let i = start; i <= end; i++) {
            newSelectedSentences.push(i);
          }
          return Array.from(new Set([...newSelectedSentences]));
        });
      }
    };

    // virtualization
    const virtualizer = useVirtualizer({
      count: sdocData.sentences.length,
      getScrollElement: () => virtualizerScrollElementRef.current!,
      estimateSize: () => 35,
      overscan: 2,
    });

    // rendering
    const numSentenceDigits = useMemo(() => Math.ceil(Math.log10(sdocData.sentences.length + 1)), [sdocData.sentences]);

    if (annotator.annotatorResult?.sentence_annotations && codeMap.data) {
      return (
        <>
          <AnnotationMenu
            ref={annotationMenuRef}
            onAdd={handleCodeSelectorAddCode}
            onClose={handleCodeSelectorClose}
            onEdit={handleCodeSelectorEditCode}
            onDelete={handleCodeSelectorDeleteAnnotation}
          />
          <Box {...props}>
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
              onMouseUp={handleMouseUp}
            >
              {virtualizer.getVirtualItems().map((item) => {
                const sentence = sdocData.sentences[item.index];
                return (
                  <div
                    key={item.key}
                    data-index={item.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${item.start}px)`,
                    }}
                  >
                    <DocumentSentence
                      sentenceId={item.index}
                      sentenceAnnotations={annotator.annotatorResult!.sentence_annotations[item.index]}
                      sentence={sentence}
                      isSelected={selectedSentences.includes(item.index)}
                      selectedCodeId={mostRecentCodeId}
                      onAnnotationClick={(event, sentAnnoId) => handleAnnotationClick(event, sentAnnoId, item.index)}
                      onAnnotationMouseEnter={handleAnnotationMouseEnter}
                      onAnnotationMouseLeave={handleAnnotationMouseLeave}
                      onSentenceMouseDown={handleSentenceMouseDown}
                      onSentenceMouseEnter={handleSentenceMouseEnter}
                      hoveredSentAnnoId={hoverSentAnnoId}
                      annotationPositions={annotator.annotationPositions[item.index]}
                      numPositions={annotator.numPositions}
                      numSentenceDigits={numSentenceDigits}
                      hoveredCodeId={hoveredCodeId}
                      selectedSentAnnoId={selectedAnnotationId}
                      codeMap={codeMap.data}
                    />
                  </div>
                );
              })}
            </div>
          </Box>
        </>
      );
    }
    return null;
  },
);
