import { CodeHooks } from "@api/hooks/CodeHooks";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { Box, BoxProps } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useMemo, useRef, useState } from "react";

import { SentenceAnnotationHooks } from "@api/hooks/SentenceAnnotationHooks";
import { useAuth } from "@core/auth";
import { useOpenConfirmationDialog, useOpenSnackbar } from "@core/notification";
import { SentenceAnnotationCreate } from "@models/SentenceAnnotationCreate";
import { AnnotationRouteAPI } from "../../../_hooks/annotationRouteAPI";
import { toPendingSentenceAnnotation } from "../../../_hooks/pendingSentenceAnnotation";
import { useJumpToSentenceAnnotation } from "../../../_hooks/useJumpToSentenceAnnotation";
import { useSentenceAnnotationHighlight } from "../../../_hooks/useSentenceAnnotationHighlight";
import { useSentenceAnnotationResize } from "../../../_hooks/useSentenceAnnotationResize";
import { Annotation } from "../../../_types/Annotation";
import { AnnoActions } from "../../../store/annoSlice";
import { AnnotationMenu, AnnotationMenuHandle } from "../../annotation-menu";
import { useGetSentenceAnnotator } from "../_hooks/useGetSentenceAnnotator";
import { DocumentSentence } from "./_components/DocumentSentence";

interface SentenceAnnotatorProps {
  sdocData: SourceDocumentDataRead;
  virtualizerScrollElement: HTMLDivElement;
}

const isSentenceAnnotation = (annotation: Annotation): annotation is SentenceAnnotationRead => {
  return "sentence_id_start" in annotation;
};

export const SentenceAnnotator = memo(
  ({ sdocData, virtualizerScrollElement, ...props }: SentenceAnnotatorProps & BoxProps) => {
    // global client state (URL search params)
    const { visibleUserId, selectedAnnotationId } = AnnotationRouteAPI.useSearch();

    // global server state (react-query)
    const codeMap = CodeHooks.useGetAllCodesMap();

    // selection
    const mostRecentCodeId = useAppSelector((state) => state.annotations.mostRecentCodeId);
    const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
    const [selectedSentences, setSelectedSentences] = useState<number[]>([]);
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // highlighting
    const hoveredCodeId = useAppSelector((state) => state.annotations.hoveredCodeId);
    const [hoverSentAnnoId, setHoverSentAnnoId] = useState<number | null>(null);

    // pending annotations (not yet persisted, rendered from local state only)
    const [pendingAnnotations, setPendingAnnotations] = useState<SentenceAnnotationRead[]>([]);
    // the draft annotation whose code-selector menu is currently open (not yet sent to the server)
    const [draftAnnotation, setDraftAnnotation] = useState<SentenceAnnotationRead | undefined>(undefined);

    // the draft (menu open) is rendered as a preview alongside the in-flight pending annotations
    const allPendingAnnotations = useMemo<SentenceAnnotationRead[]>(
      () => (draftAnnotation ? [...pendingAnnotations, draftAnnotation] : pendingAnnotations),
      [pendingAnnotations, draftAnnotation],
    );

    // annotation menu
    const annotationMenuRef = useRef<AnnotationMenuHandle>(null);
    const dispatch = useAppDispatch();
    const { user } = useAuth();
    const openSnackbar = useOpenSnackbar();
    const createMutation = SentenceAnnotationHooks.useCreateSentenceAnnotation();
    const deleteMutation = SentenceAnnotationHooks.useDeleteSentenceAnnotation();
    const updateMutation = SentenceAnnotationHooks.useUpdateSentenceAnnotation();

    // resize
    const resizeController = useSentenceAnnotationResize(sdocData.sentences.length);
    const previewAnnotation = resizeController.previewAnnotation;

    // pass the preview annotation as an override so that lane assignment
    // reflects the drag state and stays consistent with the post-update layout
    const annotator = useGetSentenceAnnotator({
      sdocId: sdocData.id,
      userId: visibleUserId,
      annotationOverride: previewAnnotation,
      pendingAnnotations: allPendingAnnotations,
    });

    // virtualization
    const virtualizer = useVirtualizer({
      count: sdocData.sentences.length,
      getScrollElement: () => virtualizerScrollElement,
      estimateSize: () => 35,
      overscan: 2,
    });

    // jump to & highlight the selected annotation (needs virtualizer + annotator data)
    useJumpToSentenceAnnotation(selectedAnnotationId, virtualizer, annotator.annotatorResult?.sentence_annotations);
    useSentenceAnnotationHighlight(selectedAnnotationId);

    const openConfirmationDialog = useOpenConfirmationDialog();
    const handleCodeSelectorDeleteAnnotation = (annotation: Annotation) => {
      openConfirmationDialog({
        text: `Do you really want to remove the SentenceAnnotation ${annotation.id}? You can reassign it later!`,
        type: "DELETE",
        onAccept: () => {
          deleteMutation.mutate(annotation as SentenceAnnotationRead);
        },
      });
    };
    const handleCodeSelectorEditCode = (annotation: Annotation, codeId: number) => {
      updateMutation.mutate({
        sentenceAnnoToUpdate: annotation as SentenceAnnotationRead,
        update: {
          code_id: codeId,
        },
      });
    };
    const startCreate = (requestBody: SentenceAnnotationCreate, onSuccess?: () => void) => {
      const pending = toPendingSentenceAnnotation(requestBody, user?.id);
      setPendingAnnotations((prev) => [...prev, pending]);
      createMutation.mutate(
        { requestBody },
        {
          onSuccess,
          onSettled: () => {
            setPendingAnnotations((prev) => prev.filter((a) => a.id !== pending.id));
          },
        },
      );
    };
    const handleCodeSelectorAddCode = (codeId: number, isNewCode: boolean) => {
      if (!draftAnnotation) return;
      setSelectedSentences([]);
      setLastClickedIndex(null);
      setDraftAnnotation(undefined);
      startCreate(
        {
          code_id: codeId,
          sdoc_id: draftAnnotation.sdoc_id,
          sentence_id_start: draftAnnotation.sentence_id_start,
          sentence_id_end: draftAnnotation.sentence_id_end,
        },
        () => {
          if (!isNewCode) {
            // if we use an existing code to annotate, we move it to the top
            dispatch(AnnoActions.moveCodeToTop(codeId));
          }
        },
      );
    };
    const handleCodeSelectorDuplicateAnnotation = (annotation: Annotation, codeId: number) => {
      if (!isSentenceAnnotation(annotation)) {
        return;
      }
      startCreate(
        {
          code_id: codeId,
          sdoc_id: annotation.sdoc_id,
          sentence_id_start: annotation.sentence_id_start,
          sentence_id_end: annotation.sentence_id_end,
        },
        () => {
          dispatch(AnnoActions.moveCodeToTop(codeId));
        },
      );
    };
    const handleCodeSelectorClose = (reason?: "backdropClick" | "escapeKeyDown") => {
      // i clicked away because i like the annotation as is
      if (draftAnnotation && reason === "backdropClick") {
        startCreate({
          code_id: draftAnnotation.code_id,
          sdoc_id: draftAnnotation.sdoc_id,
          sentence_id_start: draftAnnotation.sentence_id_start,
          sentence_id_end: draftAnnotation.sentence_id_end,
        });
      }
      // i clicked escape because i want to cancel the annotation
      if (reason === "escapeKeyDown") {
        console.log("cancel annotation");
      }

      setSelectedSentences([]);
      setLastClickedIndex(null);
      setDraftAnnotation(undefined);
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
      // ignore mouse down during/after a resize drag
      if (resizeController.shouldIgnoreMouseUp()) {
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
      // ignore the mouse up that ends a resize drag
      if (resizeController.shouldIgnoreMouseUp()) {
        return;
      }
      if (selectedSentences.length === 0) {
        return;
      }

      // ensure that event.target contains the attribute data-sent-id (and therefore is a sentence)
      if (!(event.target as HTMLElement).hasAttribute("data-sent-id")) {
        return;
      }

      // only allow annotation creation if the current user is the same as the visibleUserId (from URL search params)
      if (user?.id !== visibleUserId) {
        openSnackbar({
          severity: "warning",
          text: "You cannot create annotations while viewing another user's annotation! Switch to your user in the Annotator Selector (top) to create annotations.",
        });
        setSelectedSentences([]);
        setLastClickedIndex(null);
        return;
      }

      // a code must be selected before creating an annotation
      if (!mostRecentCodeId && !selectedCodeId) {
        openSnackbar({
          severity: "warning",
          text: "Select a code in the Code Explorer (left) first!",
        });
        setSelectedSentences([]);
        setLastClickedIndex(null);
        return;
      }

      // create a draft annotation for visual preview (rendered via pendingAnnotations)
      const requestBody: SentenceAnnotationCreate = {
        code_id: mostRecentCodeId || selectedCodeId || -1,
        sdoc_id: sdocData.id,
        sentence_id_start: selectedSentences[0],
        sentence_id_end: selectedSentences[selectedSentences.length - 1],
      };
      const draft = toPendingSentenceAnnotation(requestBody, user?.id);
      setDraftAnnotation(draft);

      // open annotation menu in add mode (code selector visible immediately)
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
            onDuplicate={handleCodeSelectorDuplicateAnnotation}
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
                      sentenceAnnotations={annotator.sentenceAnnotations[item.index] ?? []}
                      sentence={sentence}
                      isSelected={selectedSentences.includes(item.index)}
                      onAnnotationClick={(event, sentAnnoId) => handleAnnotationClick(event, sentAnnoId, item.index)}
                      onAnnotationMouseEnter={handleAnnotationMouseEnter}
                      onAnnotationMouseLeave={handleAnnotationMouseLeave}
                      onSentenceMouseDown={handleSentenceMouseDown}
                      onSentenceMouseEnter={handleSentenceMouseEnter}
                      onResizeStart={resizeController.handleResizeStart}
                      hoveredSentAnnoId={previewAnnotation ? previewAnnotation.id : hoverSentAnnoId}
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
