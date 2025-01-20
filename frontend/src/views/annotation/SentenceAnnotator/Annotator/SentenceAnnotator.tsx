import { Box, BoxProps, List } from "@mui/material";
import { difference, intersection } from "lodash";
import { useMemo, useRef, useState } from "react";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { SentenceAnnotationReadResolved } from "../../../../api/openapi/models/SentenceAnnotationReadResolved.ts";
import { SourceDocumentDataRead } from "../../../../api/openapi/models/SourceDocumentDataRead.ts";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { useAuth } from "../../../../auth/useAuth.ts";
import { useOpenSnackbar } from "../../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../annoSlice.ts";
import { Annotation } from "../../Annotation.ts";
import AnnotationMenu, { CodeSelectorHandle } from "../../AnnotationMenu/AnnotationMenu.tsx";
import { ICode } from "../../ICode.ts";
import {
  useCreateSentenceAnnotation,
  useDeleteSentenceAnnotation,
  useUpdateSentenceAnnotation,
} from "../sentenceAnnotationHooks.ts";
import DocumentSentence from "./DocumentSentence.tsx";

interface SentenceAnnotatorProps {
  sdocData: SourceDocumentDataRead;
}

function SentenceAnnotator({ sdocData, ...props }: SentenceAnnotatorProps & BoxProps) {
  // auth state
  const user = useAuth().user;

  // global client state (redux)
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);

  // global server state (react-query)
  const annotatorResult = SdocHooks.useGetSentenceAnnotator(sdocData.id, visibleUserId);
  const { annotationPositions, numPositions } = useMemo(() => {
    if (!annotatorResult.data?.sentence_annotations) return { annotationPositions: [], numPositions: 0 };
    const sentenceAnnotations = Object.values(annotatorResult.data.sentence_annotations);

    if (sentenceAnnotations.length === 0) return { annotationPositions: [], numPositions: 0 };

    // map from annotation id to position
    const annotationPositions: Record<number, number>[] = [
      sentenceAnnotations[0].reduce(
        (acc, sentAnno) => {
          acc[sentAnno.id] = Object.keys(acc).length;
          return acc;
        },
        {} as Record<number, number>,
      ),
    ];
    let numPositions = sentenceAnnotations[0].length;

    for (let i = 1; i < sentenceAnnotations.length; i++) {
      const annotations = sentenceAnnotations[i];
      const prevAnnotationPositions = annotationPositions[i - 1];

      const prevAnnotations = Object.keys(prevAnnotationPositions).map((id) => parseInt(id));
      const currentAnnotations = annotations.map((sentAnno) => sentAnno.id);

      const sameAnnotations = intersection(prevAnnotations, currentAnnotations);
      const newAnnotations = difference(currentAnnotations, prevAnnotations);

      const annotationPosition: Record<number, number> = {};
      const occupiedPositions: number[] = [];

      // fill with positions of same annotations
      for (const annoId of sameAnnotations) {
        annotationPosition[annoId] = prevAnnotationPositions[annoId];
        occupiedPositions.push(prevAnnotationPositions[annoId]);
      }

      // fill with positions of new annotations
      for (const annoId of newAnnotations) {
        const maxPosition = Math.max(0, ...occupiedPositions);
        const allPositions = Array.from({ length: maxPosition + 2 }, (_, i) => i);
        const availablePositions = difference(allPositions, occupiedPositions);

        annotationPosition[annoId] = Math.min(...availablePositions);
        occupiedPositions.push(annotationPosition[annoId]);

        if (annotationPosition[annoId] > numPositions) {
          numPositions = annotationPosition[annoId];
        }
      }

      annotationPositions.push(annotationPosition);
    }

    // flip keys and values of annotationPositions (key: position, value: annotation id)
    const flippedAnnotationPositions = annotationPositions.map((positions) => {
      const flipped: Record<number, number> = {};
      for (const [annoId, position] of Object.entries(positions)) {
        flipped[position] = parseInt(annoId);
      }
      return flipped;
    });

    return { annotationPositions: flippedAnnotationPositions, numPositions };
  }, [annotatorResult.data?.sentence_annotations]);

  // selection
  const mostRecentCode = useAppSelector((state) => state.annotations.mostRecentCode);
  const [selectedSentences, setSelectedSentences] = useState<number[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // highlighting
  const selectedAnnotationId = useAppSelector((state) => state.annotations.selectedAnnotationId);
  const hoveredCodeId = useAppSelector((state) => state.annotations.hoveredCodeId);
  const [hoverSentAnnoId, setHoverSentAnnoId] = useState<number | null>(null);

  // annotation menu
  const annotationMenuRef = useRef<CodeSelectorHandle>(null);
  const dispatch = useAppDispatch();
  const openSnackbar = useOpenSnackbar();
  const createMutation = useCreateSentenceAnnotation(user?.id || -1);
  const deleteMutation = useDeleteSentenceAnnotation();
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

  // event handlers
  const handleAnnotationClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    sentAnnoId: number,
    sentenceIdx: number,
  ) => {
    if (!annotatorResult.data) return;

    // annotation to display
    const annotation = annotatorResult.data.sentence_annotations[sentenceIdx].find(
      (sentAnno) => sentAnno.id === sentAnnoId,
    );

    if (!annotation) {
      console.error(`Annotation with id ${sentAnnoId} not found.`);
      return;
    }

    console.log("CLICK!");

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

  const handleSentenceClick = (_: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {
    setSelectedSentences((selectedSentences) => {
      if (selectedSentences.includes(index)) {
        return [];
      }
      return [index];
    });
    setLastClickedIndex((lastClickedIndex) => (lastClickedIndex === index ? null : index));
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {
    setIsDragging(true);
    handleSentenceClick(event, index);
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLUListElement, MouseEvent>) => {
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

  const handleMouseEnter = (index: number) => {
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

  if (!annotatorResult.data) return null;
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
        <List onMouseUp={handleMouseUp} sx={{ p: 0 }}>
          {sdocData.sentences.map((sentence, sentenceId) => (
            <DocumentSentence
              key={sentenceId}
              sentenceId={sentenceId}
              sentenceAnnotations={annotatorResult.data.sentence_annotations[sentenceId]}
              sentence={sentence}
              isSelected={selectedSentences.includes(sentenceId)}
              selectedCode={mostRecentCode}
              onMouseDown={(event) => handleMouseDown(event, sentenceId)}
              onMouseEnter={() => handleMouseEnter(sentenceId)}
              onAnnotationClick={(event, sentAnnoId) => handleAnnotationClick(event, sentAnnoId, sentenceId)}
              onAnnotationMouseEnter={handleAnnotationMouseEnter}
              onAnnotationMouseLeave={handleAnnotationMouseLeave}
              hoveredSentAnnoId={hoverSentAnnoId}
              annotationPositions={annotationPositions[sentenceId]}
              numPositions={numPositions}
              numSentenceDigits={numSentenceDigits}
              hoveredCodeId={hoveredCodeId}
              selectedSentAnnoId={selectedAnnotationId}
            />
          ))}
        </List>
      </Box>
    </>
  );
}

export default SentenceAnnotator;
