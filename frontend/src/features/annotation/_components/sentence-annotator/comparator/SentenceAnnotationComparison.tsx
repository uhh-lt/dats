import { CodeHooks } from "@api/hooks/CodeHooks";
import { SentenceAnnotationHooks } from "@api/hooks/SentenceAnnotationHooks";
import { useAuth } from "@core/auth";
import { useOpenConfirmationDialog, useOpenSnackbar } from "@core/notification";
import { SentenceAnnotationCreate } from "@models/SentenceAnnotationCreate";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { Box, BoxProps } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useMemo, useRef, useState } from "react";
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
import { DocumentSentenceHeader } from "./_components/DocumentSentenceHeader";
import { isAnnotationSame } from "./_utils/comparisonUtils";

interface SentenceAnnotationComparisonProps {
  sdocData: SourceDocumentDataRead;
  virtualizerScrollElement: HTMLDivElement;
}

const isSentenceAnnotation = (annotation: Annotation): annotation is SentenceAnnotationRead => {
  return "sentence_id_start" in annotation;
};

export const SentenceAnnotationComparison = memo(
  ({ sdocData, virtualizerScrollElement, ...props }: SentenceAnnotationComparisonProps & BoxProps) => {
    // auth state
    const user = useAuth().user;

    // global client state (URL search params)
    const {
      visibleUserId: leftUserId,
      compareWithUserId: rightUserId,
      selectedAnnotationId,
    } = AnnotationRouteAPI.useSearch();

    const isAnnotationAllowedLeft = leftUserId === user?.id;
    const isAnnotationAllowedRight = rightUserId === user?.id;

    // resize controllers (left + right)
    const leftResizeController = useSentenceAnnotationResize(sdocData.sentences.length);
    const rightResizeController = useSentenceAnnotationResize(sdocData.sentences.length);

    // pending annotations (not yet persisted, rendered from local state only).
    // Only one side is ever editable (the current user's), so all pending annotations belong to it
    // and are routed to that side's annotator only.
    const [pendingAnnotations, setPendingAnnotations] = useState<SentenceAnnotationRead[]>([]);
    // the draft annotation whose code-selector menu is currently open (not yet sent to the server)
    const [draftAnnotation, setDraftAnnotation] = useState<SentenceAnnotationRead | undefined>(undefined);

    // the draft (menu open) is rendered as a preview alongside the in-flight pending annotations
    const allPendingAnnotations = useMemo<SentenceAnnotationRead[]>(
      () => (draftAnnotation ? [...pendingAnnotations, draftAnnotation] : pendingAnnotations),
      [pendingAnnotations, draftAnnotation],
    );
    const editableSide: "left" | "right" = isAnnotationAllowedRight && !isAnnotationAllowedLeft ? "right" : "left";

    // global server state (react-query)
    const codeMap = CodeHooks.useGetAllCodesMap();
    const annotatorLeft = useGetSentenceAnnotator({
      sdocId: sdocData.id,
      userId: leftUserId,
      annotationOverride: leftResizeController.previewAnnotation,
      pendingAnnotations: editableSide === "left" ? allPendingAnnotations : undefined,
    });
    const annotatorRight = useGetSentenceAnnotator({
      sdocId: sdocData.id,
      userId: rightUserId,
      annotationOverride: rightResizeController.previewAnnotation,
      pendingAnnotations: editableSide === "right" ? allPendingAnnotations : undefined,
    });

    // selection
    const mostRecentCodeId = useAppSelector((state) => state.annotations.mostRecentCodeId);
    const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
    const [selectedSentences, setSelectedSentences] = useState<number[]>([]);
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    // the side on which the current selection attempt started; used to warn when it is not the user's side
    // and to highlight the selection only on the side where it was started (never on the other side)
    const [selectionAllowed, setSelectionAllowed] = useState<boolean>(false);
    const [selectionSide, setSelectionSide] = useState<"left" | "right" | null>(null);

    // highlighting
    const hoveredCodeId = useAppSelector((state) => state.annotations.hoveredCodeId);
    const [hoverSentAnnoId, setHoverSentAnnoId] = useState<number | null>(null);

    // annotation menu
    const annotationMenuRef = useRef<AnnotationMenuHandle>(null);
    const dispatch = useAppDispatch();
    const openSnackbar = useOpenSnackbar();
    const createMutation = SentenceAnnotationHooks.useCreateSentenceAnnotation();
    const createBulkMutation = SentenceAnnotationHooks.useCreateBulkSentenceAnnotation();
    const deleteMutation = SentenceAnnotationHooks.useDeleteSentenceAnnotation();
    const deleteBulkMutation = SentenceAnnotationHooks.useDeleteBulkSentenceAnnotationSingleSdoc();
    const updateMutation = SentenceAnnotationHooks.useUpdateSentenceAnnotation();
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
      setSelectionSide(null);
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
      setSelectionSide(null);
      setDraftAnnotation(undefined);
      setHoverSentAnnoId(null);
    };

    // batch processing events
    const handleClickApplyAll = () => {
      // find my and the other person's annotations
      const otherAnnotator = leftUserId === user!.id ? annotatorRight : annotatorLeft;
      const myAnnotator = leftUserId === user!.id ? annotatorLeft : annotatorRight;
      if (myAnnotator.annotatorResult === undefined) return;
      if (otherAnnotator.annotatorResult === undefined) return;

      // identify differences: which annotations are only in the other person's annotations
      const newAnnotations: SentenceAnnotationRead[] = [];
      // 1. iterate over all sentences & their annotations
      Object.entries(otherAnnotator.annotatorResult.sentence_annotations).forEach(([sentenceId, otherAnnotations]) => {
        const sentId = parseInt(sentenceId);

        // 2. find others annotations that are starting at the current sentence
        const otherAnnotationsAtSentence = otherAnnotations.filter((sa) => sa.sentence_id_start === sentId);

        // 3. find my annotations that are starting at the current sentence
        const myAnnotationsAtSentence = myAnnotator.annotatorResult!.sentence_annotations[sentenceId].filter(
          (sa) => sa.sentence_id_start === sentId,
        );

        // 4. find annotations that are only in the other person's annotations
        const onlyInOtherAnnotations = otherAnnotationsAtSentence.filter((otherAnnotation) => {
          return !myAnnotationsAtSentence.some((myAnnotation) => isAnnotationSame(myAnnotation, otherAnnotation));
        });

        // 5. add these annotations to the newAnnotations array
        newAnnotations.push(...onlyInOtherAnnotations);
      });

      if (newAnnotations.length === 0) {
        return;
      }

      createBulkMutation.mutate({
        requestBody: newAnnotations,
      });
    };

    const handleClickRevertAll = () => {
      // find my and the other person's annotations
      const otherAnnotator = leftUserId === user!.id ? annotatorRight : annotatorLeft;
      const myAnnotator = leftUserId === user!.id ? annotatorLeft : annotatorRight;
      if (myAnnotator.annotatorResult === undefined) return;
      if (otherAnnotator.annotatorResult === undefined) return;

      // identify same annotations: which annotations are only in the other person's annotations and in mine
      const sameAnnotations: SentenceAnnotationRead[] = [];
      // 1. iterate over all sentences & their annotations
      Object.entries(otherAnnotator.annotatorResult.sentence_annotations).forEach(([sentenceId, otherAnnotations]) => {
        const sentId = parseInt(sentenceId);

        // 2. find others annotations that are starting at the current sentence
        const otherAnnotationsAtSentence = otherAnnotations.filter((sa) => sa.sentence_id_start === sentId);

        // 3. find my annotations that are starting at the current sentence
        const myAnnotationsAtSentence = myAnnotator.annotatorResult!.sentence_annotations[sentenceId].filter(
          (sa) => sa.sentence_id_start === sentId,
        );

        // 4. find annotations that are same in the other person's annotations and in mine
        const inBothAnnotations = myAnnotationsAtSentence.filter((otherAnnotation) => {
          return otherAnnotationsAtSentence.some((myAnnotation) => isAnnotationSame(myAnnotation, otherAnnotation));
        });

        // 5. add these annotations to the newAnnotations array
        sameAnnotations.push(...inBothAnnotations);
      });

      if (sameAnnotations.length === 0) {
        return;
      }

      deleteBulkMutation.mutate(sameAnnotations);
    };

    // single processing events
    const handleApplyAnnotation = (annotation: SentenceAnnotationRead) => {
      createMutation.mutate({
        requestBody: annotation,
      });
    };

    const handleRevertAnnotation = (annotation: SentenceAnnotationRead) => {
      deleteMutation.mutate(annotation);
    };

    // event handlers
    const handleAnnotationClick = (
      event: React.MouseEvent<HTMLDivElement, MouseEvent>,
      sentenceAnnotation: SentenceAnnotationRead,
    ) => {
      // highlight annotation
      setHoverSentAnnoId(sentenceAnnotation.id);

      // open code selector
      const target: HTMLElement = event.target as HTMLElement;
      const boundingBox = target.getBoundingClientRect();
      const position = {
        left: boundingBox.left,
        top: boundingBox.top + boundingBox.height,
      };
      annotationMenuRef.current!.open(position, [sentenceAnnotation]);
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

    const handleSentenceMouseDown = (
      _: React.MouseEvent<HTMLDivElement, MouseEvent>,
      sentenceId: number,
      side: "left" | "right",
      isAllowed: boolean,
    ) => {
      // ignore mouse down during/after a resize drag
      if (leftResizeController.shouldIgnoreMouseUp() || rightResizeController.shouldIgnoreMouseUp()) {
        return;
      }
      // start a drag-selection on both sides (like the native text selection in the span comparator);
      // the highlight is shown only on the side where the drag started (selectionSide), and handleMouseUp
      // warns when that side is not the current user's side.
      setIsDragging(true);
      setSelectionAllowed(isAllowed);
      setSelectionSide(side);
      setSelectedSentences((selectedSentences) => {
        if (selectedSentences.includes(sentenceId)) {
          return [];
        }
        return [sentenceId];
      });
      setLastClickedIndex((lastClickedIndex) => (lastClickedIndex === sentenceId ? null : sentenceId));
    };

    const handleMouseUp = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      setIsDragging(false);
      // ignore the mouse up that ends a resize drag
      if (leftResizeController.shouldIgnoreMouseUp() || rightResizeController.shouldIgnoreMouseUp()) {
        return;
      }
      if (selectedSentences.length === 0) {
        return;
      }

      // ensure that event.target contains the attribute data-sent-id (and therefore is a sentence)
      if (!(event.target as HTMLElement).hasAttribute("data-sent-id")) {
        return;
      }

      // a sentence selection exists: this is annotation creation, only allowed on the current user's side.
      // warn and clear the selection when the selection was started on the other user's side.
      if (!selectionAllowed) {
        openSnackbar({
          severity: "warning",
          text: "You cannot create annotations on another user's document. Switch to your user in the Annotator Selector (top) to create annotations.",
        });
        setSelectedSentences([]);
        setLastClickedIndex(null);
        setSelectionSide(null);
        return;
      }

      if (!mostRecentCodeId && !selectedCodeId) {
        openSnackbar({
          severity: "warning",
          text: "Select a code in the Code Explorer (left) first!",
        });
        setSelectedSentences([]);
        setLastClickedIndex(null);
        setSelectionSide(null);
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

    // virtualization
    const virtualizer = useVirtualizer({
      count: sdocData.sentences.length + 1, // + 1 because of the header
      getScrollElement: () => virtualizerScrollElement,
      estimateSize: () => 35,
      overscan: 2,
    });

    // jump to & highlight the selected annotation (needs virtualizer + annotator data)
    // for the comparator, we search both left and right annotations
    const allAnnotations = useMemo(() => {
      const result: Record<number, SentenceAnnotationRead[]> = {};
      if (annotatorLeft.annotatorResult?.sentence_annotations) {
        Object.entries(annotatorLeft.annotatorResult.sentence_annotations).forEach(([sentId, annos]) => {
          const idx = parseInt(sentId);
          if (!result[idx]) result[idx] = [];
          result[idx].push(...annos);
        });
      }
      if (annotatorRight.annotatorResult?.sentence_annotations) {
        Object.entries(annotatorRight.annotatorResult.sentence_annotations).forEach(([sentId, annos]) => {
          const idx = parseInt(sentId);
          if (!result[idx]) result[idx] = [];
          result[idx].push(...annos);
        });
      }
      return result;
    }, [annotatorLeft.annotatorResult?.sentence_annotations, annotatorRight.annotatorResult?.sentence_annotations]);

    useJumpToSentenceAnnotation(selectedAnnotationId, virtualizer, allAnnotations, { block: "center" });
    useSentenceAnnotationHighlight(selectedAnnotationId);

    // rendering
    const numSentenceDigits = useMemo(() => Math.ceil(Math.log10(sdocData.sentences.length + 1)), [sdocData.sentences]);

    if (!codeMap.data) return null;
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
              // special case: render header
              if (item.index === 0) {
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
                    <DocumentSentenceHeader
                      leftUserId={leftUserId}
                      rightUserId={rightUserId}
                      numSentenceDigits={numSentenceDigits}
                      annotatorLeft={annotatorLeft}
                      annotatorRight={annotatorRight}
                      showBulkActions={leftUserId === user!.id || rightUserId === user!.id}
                      onClickRevertAll={handleClickRevertAll}
                      onClickApplyAll={handleClickApplyAll}
                      isDirectionLeft={leftUserId === user!.id}
                      isApplyAllLoading={createBulkMutation.isPending}
                      isRevertAllLoading={deleteBulkMutation.isPending}
                    />
                  </div>
                );
              }

              const sentId = item.index - 1;
              const sentence = sdocData.sentences[sentId];
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
                    sentenceId={sentId}
                    sentence={sentence}
                    isSelected={selectedSentences.includes(sentId)}
                    selectionSide={selectionSide}
                    onSentenceMouseDown={handleSentenceMouseDown}
                    onSentenceMouseEnter={handleSentenceMouseEnter}
                    onAnnotationClick={handleAnnotationClick}
                    onAnnotationMouseEnter={handleAnnotationMouseEnter}
                    onAnnotationMouseLeave={handleAnnotationMouseLeave}
                    onApplyAnnotation={handleApplyAnnotation}
                    onRevertAnnotation={handleRevertAnnotation}
                    hoveredSentAnnoId={
                      leftResizeController.previewAnnotation
                        ? leftResizeController.previewAnnotation.id
                        : rightResizeController.previewAnnotation
                          ? rightResizeController.previewAnnotation.id
                          : hoverSentAnnoId
                    }
                    numSentenceDigits={numSentenceDigits}
                    hoveredCodeId={hoveredCodeId}
                    annotatorLeft={annotatorLeft}
                    annotatorRight={annotatorRight}
                    isAnnotationAllowedLeft={isAnnotationAllowedLeft}
                    isAnnotationAllowedRight={isAnnotationAllowedRight}
                    onResizeStartLeft={leftResizeController.handleResizeStart}
                    onResizeStartRight={rightResizeController.handleResizeStart}
                    codeMap={codeMap.data}
                  />
                </div>
              );
            })}
          </div>
        </Box>
      </>
    );
  },
);
