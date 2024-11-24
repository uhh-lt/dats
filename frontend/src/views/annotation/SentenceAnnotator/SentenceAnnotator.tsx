import { Box, BoxProps, List, ListItemButton, ListItemButtonProps, Stack, Tooltip } from "@mui/material";
import { difference, intersection } from "lodash";
import { useMemo, useRef, useState } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { SentenceAnnotationReadResolved } from "../../../api/openapi/models/SentenceAnnotationReadResolved.ts";
import { SourceDocumentDataRead } from "../../../api/openapi/models/SourceDocumentDataRead.ts";
import SdocHooks from "../../../api/SdocHooks.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import ColorUtils from "../../../utils/ColorUtils.ts";
import { AnnoActions } from "../annoSlice.ts";
import { Annotation } from "../Annotation.ts";
import AnnotationMenu, { CodeSelectorHandle } from "../AnnotationMenu/AnnotationMenu.tsx";
import { ICode } from "../ICode.ts";
import {
  useCreateSentenceAnnotation,
  useDeleteSentenceAnnotation,
  useUpdateSentenceAnnotation,
} from "./sentenceAnnotationHooks.ts";

interface SentenceAnnotatorProps {
  sdocData: SourceDocumentDataRead;
}

const SentenceAnnotator = ({ sdocData, ...props }: SentenceAnnotatorProps & BoxProps) => {
  // auth state
  const user = useAuth().user;

  // global client state (redux)
  const visibleUserIds = useAppSelector((state) => state.annotations.visibleUserIds);

  // global server state (react-query)
  const annotatorResult = SdocHooks.useGetSentenceAnnotator(sdocData.id, visibleUserIds);
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
  const hoveredCodeId = useAppSelector((state) => state.annotations.hoveredCodeId);
  const [hoverSentAnnoId, setHoverSentAnnoId] = useState<number | null>(null);

  // annotation menu
  const annotationMenuRef = useRef<CodeSelectorHandle>(null);
  const dispatch = useAppDispatch();
  const openSnackbar = useOpenSnackbar();
  const createMutation = useCreateSentenceAnnotation(visibleUserIds, user!.id);
  const deleteMutation = useDeleteSentenceAnnotation(visibleUserIds);
  const updateMutation = useUpdateSentenceAnnotation(visibleUserIds);
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

  const handleSentenceClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {
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
            />
          ))}
        </List>
      </Box>
    </>
  );
};

interface DocumentSentenceProps {
  sentenceId: number;
  isSelected: boolean;
  selectedCode: CodeRead | undefined;
  hoveredSentAnnoId: number | null;
  hoveredCodeId: number | undefined;
  sentence: string;
  sentenceAnnotations: SentenceAnnotationReadResolved[];
  onAnnotationClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentAnnoId: number) => void;
  onAnnotationMouseEnter: (sentAnnoId: number) => void;
  onAnnotationMouseLeave: (sentAnnoId: number) => void;
  numPositions: number;
  numSentenceDigits: number;
  annotationPositions: Record<number, number>;
}

const DocumentSentence = ({
  sentenceId,
  isSelected,
  selectedCode,
  hoveredSentAnnoId,
  hoveredCodeId,
  sentence,
  sentenceAnnotations,
  onAnnotationClick,
  onAnnotationMouseEnter,
  onAnnotationMouseLeave,
  numPositions,
  annotationPositions,
  numSentenceDigits,
  ...props
}: DocumentSentenceProps & ListItemButtonProps) => {
  const { codeId2CodeMap, sentAnnoId2sentAnnoMap } = useMemo(() => {
    const codeId2CodeMap = sentenceAnnotations?.reduce(
      (acc, anno) => {
        acc[anno.code.id] = anno.code;
        return acc;
      },
      {} as Record<number, CodeRead>,
    );
    const sentAnnoId2sentAnnoMap = sentenceAnnotations?.reduce(
      (acc, anno) => {
        acc[anno.id] = anno;
        return acc;
      },
      {} as Record<number, SentenceAnnotationReadResolved>,
    );
    return { codeId2CodeMap, sentAnnoId2sentAnnoMap };
  }, [sentenceAnnotations]);

  const highlightedColor = useMemo(() => {
    if (isSelected) {
      return selectedCode?.color || "rgb(255, 0, 0)";
    }
    if (hoveredSentAnnoId) {
      return sentAnnoId2sentAnnoMap[hoveredSentAnnoId]?.code.color;
    }
    if (hoveredCodeId) {
      return codeId2CodeMap[hoveredCodeId]?.color;
    }
  }, [codeId2CodeMap, hoveredCodeId, hoveredSentAnnoId, isSelected, selectedCode, sentAnnoId2sentAnnoMap]);

  return (
    <Stack direction="row" width="100%">
      <div
        style={{
          flexShrink: 0,
          paddingRight: "8px",
          paddingTop: "8px",
          borderRight: "1px solid #e8eaed",
        }}
      >
        {String(sentenceId + 1).padStart(numSentenceDigits, "0")}
      </div>
      <ListItemButton
        {...props}
        style={{ ...props.style, flexGrow: 1 }}
        data-sent-id={sentenceId}
        onFocus={(event) => {
          // prevent focus
          event.target.blur();
        }}
      >
        <div data-sent-id={sentenceId}>
          {highlightedColor ? (
            <mark
              data-sent-id={sentenceId}
              style={{
                margin: "0 -0.4em",
                padding: "0.18em 0.4em",
                borderRadius: "0.8em 0.3em",
                background: "transparent",
                backgroundImage: `linear-gradient(to right, ${ColorUtils.rgbStringToRGBA(
                  highlightedColor,
                  1,
                )}, ${ColorUtils.rgbStringToRGBA(highlightedColor, 0.7)} 4%, ${ColorUtils.rgbStringToRGBA(
                  highlightedColor,
                  0.3,
                )})`,
                boxDecorationBreak: "clone",
              }}
            >
              {sentence}
            </mark>
          ) : (
            <>{sentence}</>
          )}
        </div>
      </ListItemButton>
      {Array.from({ length: numPositions + 1 }, (_, i) => i).map((annoPosition) => {
        const annoId = annotationPositions[annoPosition] || null;
        const key = `${sentenceId}-${annoPosition}`;
        if (annoId) {
          const annotation = sentAnnoId2sentAnnoMap[annoId];
          const isStartOfAnnotation = sentenceId === annotation.sentence_id_start;
          const isEndOfAnnotation = sentenceId === annotation.sentence_id_end;
          return (
            <Tooltip key={key} title={annotation.code.name} placement="top">
              <div
                onClick={(event) => onAnnotationClick(event, annoId)}
                onMouseEnter={() => onAnnotationMouseEnter(annoId)}
                onMouseLeave={() => onAnnotationMouseLeave(annoId)}
                style={{
                  flexShrink: 0,
                  cursor: "pointer",
                  paddingRight: "8px",
                  paddingTop: isStartOfAnnotation ? "4px" : undefined,
                  paddingBottom: isEndOfAnnotation ? "4px" : undefined,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderTopRightRadius: isStartOfAnnotation ? "8px" : undefined,
                    borderBottomRightRadius: isEndOfAnnotation ? "8px" : undefined,
                    borderTop: isStartOfAnnotation ? `4px solid ${annotation.code.color}` : undefined,
                    borderBottom: isEndOfAnnotation ? `4px solid ${annotation.code.color}` : undefined,
                    borderRight: `4px solid ${annotation.code.color}`,
                    paddingLeft: "8px",
                  }}
                />
              </div>
            </Tooltip>
          );
        }
        return <div key={key} style={{ flexShrink: 0, borderRight: "4px solid transparent", paddingLeft: "16px" }} />;
      })}
    </Stack>
  );
};

export default SentenceAnnotator;
