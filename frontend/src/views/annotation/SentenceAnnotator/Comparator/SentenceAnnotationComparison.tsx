import { Box, BoxProps } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { SentenceAnnotationReadResolved } from "../../../../api/openapi/models/SentenceAnnotationReadResolved.ts";
import { SourceDocumentDataRead } from "../../../../api/openapi/models/SourceDocumentDataRead.ts";
import { useAuth } from "../../../../auth/useAuth.ts";
import { useOpenSnackbar } from "../../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../annoSlice.ts";
import { Annotation } from "../../Annotation.ts";
import AnnotationMenu, { CodeSelectorHandle } from "../../AnnotationMenu/AnnotationMenu.tsx";
import { ICode } from "../../ICode.ts";
import {
  useCreateBulkSentenceAnnotation,
  useCreateSentenceAnnotation,
  useDeleteBulkSentenceAnnotation,
  useDeleteSentenceAnnotation,
  useUpdateSentenceAnnotation,
} from "../sentenceAnnotationHooks.ts";
import { useGetSentenceAnnotator } from "../useGetSentenceAnnotator.ts";
import { isAnnotationSame } from "./comparisonUtils.ts";
import DocumentSentence from "./DocumentSentence.tsx";
import DocumentSentenceHeader from "./DocumentSentenceHeader.tsx";

interface SentenceAnnotationComparisonProps {
  sdocData: SourceDocumentDataRead;
  virtualizerScrollElementRef: React.RefObject<HTMLDivElement>;
}

function SentenceAnnotationComparison({
  sdocData,
  virtualizerScrollElementRef,
  ...props
}: SentenceAnnotationComparisonProps & BoxProps) {
  // auth state
  const user = useAuth().user;

  // global client state (redux)
  const leftUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const rightUserId = useAppSelector((state) => state.annotations.compareWithUserId);

  // global server state (react-query)
  const annotatorLeft = useGetSentenceAnnotator({ sdocId: sdocData.id, userId: leftUserId });
  const annotatorRight = useGetSentenceAnnotator({ sdocId: sdocData.id, userId: rightUserId });

  // selection
  const mostRecentCode = useAppSelector((state) => state.annotations.mostRecentCode);
  const [selectedSentences, setSelectedSentences] = useState<number[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // highlighting
  const hoveredCodeId = useAppSelector((state) => state.annotations.hoveredCodeId);
  const [hoverSentAnnoId, setHoverSentAnnoId] = useState<number | null>(null);

  // annotation menu
  const annotationMenuRef = useRef<CodeSelectorHandle>(null);
  const dispatch = useAppDispatch();
  const openSnackbar = useOpenSnackbar();
  const createMutation = useCreateSentenceAnnotation(user!.id);
  const createBulkMutation = useCreateBulkSentenceAnnotation(user!.id);
  const deleteMutation = useDeleteSentenceAnnotation();
  const deleteBulkMutation = useDeleteBulkSentenceAnnotation(user!.id);
  const updateMutation = useUpdateSentenceAnnotation();
  const handleCodeSelectorDeleteAnnotation = (annotation: Annotation) => {
    deleteMutation.mutate(
      { sentenceAnnotationToDelete: annotation as SentenceAnnotationReadResolved },
      {
        onSuccess: (sentenceAnnotation) => {
          openSnackbar({
            text: `Deleted Sentence Annotation ${sentenceAnnotation.id}`,
            severity: "success",
          });
        },
      },
    );
  };
  const handleCodeSelectorEditCode = (annotation: Annotation, code: ICode) => {
    updateMutation.mutate(
      {
        sentenceAnnoToUpdate: annotation as SentenceAnnotationReadResolved,
        code: {
          id: code.id,
          name: code.name,
          color: code.color,
          description: "",
          project_id: sdocData.project_id,
          created: "",
          updated: "",
          is_system: false,
        },
      },
      {
        onSuccess: (sentenceAnnotation) => {
          openSnackbar({
            text: `Updated Sentence Annotation ${sentenceAnnotation.id}`,
            severity: "success",
          });
        },
      },
    );
  };
  const handleCodeSelectorAddCode = (code: CodeRead, isNewCode: boolean) => {
    setSelectedSentences([]);
    setLastClickedIndex(null);
    createMutation.mutate(
      {
        code,
        sdocId: sdocData.id,
        start: selectedSentences[0],
        end: selectedSentences[selectedSentences.length - 1],
      },
      {
        onSuccess: (sentenceAnnotation) => {
          if (!isNewCode) {
            // if we use an existing code to annotate, we move it to the top
            dispatch(AnnoActions.moveCodeToTop(code));
          }
          openSnackbar({
            text: `Created Sentence Annotation ${sentenceAnnotation.id}`,
            severity: "success",
          });
        },
      },
    );
  };
  const handleCodeSelectorClose = (reason?: "backdropClick" | "escapeKeyDown") => {
    // i clicked away because i like the annotation as is
    if (selectedSentences.length > 0 && reason === "backdropClick" && mostRecentCode) {
      createMutation.mutate(
        {
          code: mostRecentCode,
          sdocId: sdocData.id,
          start: selectedSentences[0],
          end: selectedSentences[selectedSentences.length - 1],
        },
        {
          onSuccess: (sentenceAnnotation) => {
            openSnackbar({
              text: `Created Sentence Annotation ${sentenceAnnotation.id}`,
              severity: "success",
            });
          },
        },
      );
    }
    // i clicked escape because i want to cancel the annotation
    if (reason === "escapeKeyDown") {
      console.log("cancel annotation");
    }

    setSelectedSentences([]);
    setLastClickedIndex(null);
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
    const newAnnotations: SentenceAnnotationReadResolved[] = [];
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

    createBulkMutation.mutate(
      {
        annotations: newAnnotations.map((annotation) => ({
          code: annotation.code,
          sdocId: annotation.sdoc_id,
          start: annotation.sentence_id_start,
          end: annotation.sentence_id_end,
        })),
        sdocId: sdocData.id,
      },
      {
        onSuccess: () => {
          openSnackbar({
            text: `Applied All Sentence Annotations`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleClickRevertAll = () => {
    // find my and the other person's annotations
    const otherAnnotator = leftUserId === user!.id ? annotatorRight : annotatorLeft;
    const myAnnotator = leftUserId === user!.id ? annotatorLeft : annotatorRight;
    if (myAnnotator.annotatorResult === undefined) return;
    if (otherAnnotator.annotatorResult === undefined) return;

    // identify same annotations: which annotations are only in the other person's annotations and in mine
    const sameAnnotations: SentenceAnnotationReadResolved[] = [];
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

    deleteBulkMutation.mutate(
      {
        sdocId: sdocData.id,
        sentenceAnnotationToDelete: sameAnnotations,
      },
      {
        onSuccess: () => {
          openSnackbar({
            text: `Reverted All Sentence Annotations`,
            severity: "success",
          });
        },
      },
    );
  };

  // single processing events
  const handleApplyAnnotation = (annotation: SentenceAnnotationReadResolved) => {
    createMutation.mutate(
      {
        code: annotation.code,
        sdocId: annotation.sdoc_id,
        start: annotation.sentence_id_start,
        end: annotation.sentence_id_end,
      },
      {
        onSuccess: (sentenceAnnotation) => {
          openSnackbar({
            text: `Applied Sentence Annotation ${sentenceAnnotation.id}`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleRevertAnnotation = (annotation: SentenceAnnotationReadResolved) => {
    deleteMutation.mutate(
      { sentenceAnnotationToDelete: annotation },
      {
        onSuccess: (sentenceAnnotation) => {
          openSnackbar({
            text: `Reverted Sentence Annotation ${sentenceAnnotation.id}`,
            severity: "success",
          });
        },
      },
    );
  };

  // event handlers
  const handleAnnotationClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    sentenceAnnotation: SentenceAnnotationReadResolved,
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

  const handleSentenceMouseDown = (_: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => {
    setIsDragging(true);
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
    count: sdocData.sentences.length + 1, // + 1 because of the header
    getScrollElement: () => virtualizerScrollElementRef.current!,
    estimateSize: () => 35,
    overscan: 2,
  });

  // rendering
  const numSentenceDigits = useMemo(() => Math.ceil(Math.log10(sdocData.sentences.length + 1)), [sdocData.sentences]);

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
                  selectedCode={mostRecentCode}
                  onSentenceMouseDown={handleSentenceMouseDown}
                  onSentenceMouseEnter={handleSentenceMouseEnter}
                  onAnnotationClick={handleAnnotationClick}
                  onAnnotationMouseEnter={handleAnnotationMouseEnter}
                  onAnnotationMouseLeave={handleAnnotationMouseLeave}
                  onApplyAnnotation={handleApplyAnnotation}
                  onRevertAnnotation={handleRevertAnnotation}
                  hoveredSentAnnoId={hoverSentAnnoId}
                  numSentenceDigits={numSentenceDigits}
                  hoveredCodeId={hoveredCodeId}
                  annotatorLeft={annotatorLeft}
                  annotatorRight={annotatorRight}
                  isAnnotationAllowedLeft={leftUserId === user!.id}
                  isAnnotationAllowedRight={rightUserId === user!.id}
                />
              </div>
            );
          })}
        </div>
      </Box>
    </>
  );
}

export default SentenceAnnotationComparison;
