import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ClearIcon from "@mui/icons-material/Clear";
import SquareIcon from "@mui/icons-material/Square";
import { Box, BoxProps, Button, IconButton, List, ListItemButton, Stack, Tooltip, Typography } from "@mui/material";
import { useMemo, useRef, useState } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { SentenceAnnotationReadResolved } from "../../../api/openapi/models/SentenceAnnotationReadResolved.ts";
import { SentenceAnnotatorResult } from "../../../api/openapi/models/SentenceAnnotatorResult.ts";
import { SourceDocumentDataRead } from "../../../api/openapi/models/SourceDocumentDataRead.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import UserRenderer from "../../../components/User/UserRenderer.tsx";
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
import { UseGetSentenceAnnotator, useGetSentenceAnnotator } from "./useGetSentenceAnnotator.ts";

interface SentenceAnnotationComparisonProps {
  sdocData: SourceDocumentDataRead;
}

const SentenceAnnotationComparison = ({ sdocData, ...props }: SentenceAnnotationComparisonProps & BoxProps) => {
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

  // batch processing events
  const handleClickApplyAll = () => {
    console.log("apply all");
  };

  const handleClickRevertAll = () => {
    console.log("revert all");
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
          <DocumentSentenceHeader
            leftUserId={leftUserId}
            rightUserId={rightUserId}
            numSentenceDigits={numSentenceDigits}
            annotatorLeft={annotatorLeft}
            annotatorRight={annotatorRight}
            showBulkActions={leftUserId === user!.id || rightUserId === user!.id}
            onClickRevertAll={handleClickRevertAll}
            onClickApplyAll={handleClickApplyAll}
          />
          {sdocData.sentences.map((sentence, sentenceId) => (
            <DocumentSentence
              key={sentenceId}
              sentenceId={sentenceId}
              sentence={sentence}
              isSelected={selectedSentences.includes(sentenceId)}
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
          ))}
        </List>
      </Box>
    </>
  );
};

interface DocumentSentenceHeaderProps {
  leftUserId: number | undefined;
  rightUserId: number | undefined;
  numSentenceDigits: number;
  annotatorLeft: UseGetSentenceAnnotator;
  annotatorRight: UseGetSentenceAnnotator;
  showBulkActions: boolean;
  onClickRevertAll: () => void;
  onClickApplyAll: () => void;
}

const DocumentSentenceHeader = ({
  leftUserId,
  rightUserId,
  numSentenceDigits,
  annotatorLeft,
  annotatorRight,
  showBulkActions,
  onClickApplyAll,
  onClickRevertAll,
}: DocumentSentenceHeaderProps) => {
  return (
    <Stack direction="row" width="100%">
      <DocumentSentenceHeaderPart userId={leftUserId} numSentenceDigits={numSentenceDigits} annotator={annotatorLeft} />
      {showBulkActions && (
        <>
          <div
            style={{
              paddingRight: "8px",
              borderRight: "1px solid #e8eaed",
            }}
          />
          <div
            style={{
              flexShrink: 0,
              width: 164,
              alignSelf: "center",
            }}
          >
            <Stack direction="row" alignItems="center">
              <Button onClick={onClickRevertAll}>Revert</Button>
              <Typography variant="button" color="primary">
                |
              </Typography>
              <Button onClick={onClickApplyAll}>Apply</Button>
              <Typography variant="button" color="primary" sx={{ pr: 1 }}>
                All
              </Typography>
            </Stack>
          </div>
        </>
      )}
      <DocumentSentenceHeaderPart
        userId={rightUserId}
        numSentenceDigits={numSentenceDigits}
        annotator={annotatorRight}
      />
    </Stack>
  );
};

interface DocumentSentenceHeaderPartProps {
  userId: number | undefined;
  numSentenceDigits: number;
  annotator: UseGetSentenceAnnotator;
}

const DocumentSentenceHeaderPart = ({ userId, numSentenceDigits, annotator }: DocumentSentenceHeaderPartProps) => {
  return (
    <>
      <div
        style={{
          paddingRight: "8px",
          borderLeft: "1px solid #e8eaed",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      />
      <div
        style={{
          flexShrink: 0,
          color: "transparent",
          alignSelf: "stretch",
          paddingTop: "8px",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      >
        {String(0).padStart(numSentenceDigits, "0")}
      </div>
      <div
        style={{
          paddingRight: "8px",
          borderRight: "1px solid #e8eaed",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      />
      <Typography style={{ flexGrow: 1, flexBasis: 1, paddingLeft: "16px" }} variant="h6">
        {userId ? (
          <Stack direction="row" alignItems="center">
            <UserRenderer user={userId} />
            {"'s Annotations"}
          </Stack>
        ) : (
          "Select user first"
        )}
      </Typography>
      {Array.from({ length: annotator.numPositions + 1 }, (_, i) => i).map((annoPosition) => {
        return (
          <div
            key={annoPosition}
            style={{ flexShrink: 0, borderRight: "4px solid transparent", paddingLeft: "16px" }}
          />
        );
      })}
    </>
  );
};

interface AnnotatorMaps {
  codeId2CodeMap: Record<number, CodeRead>;
  sentAnnoId2sentAnnoMap: Record<number, SentenceAnnotationReadResolved>;
}

function useComputeAnnotatorMaps(
  annotatorResult: SentenceAnnotatorResult | undefined,
  sentenceId: number,
): AnnotatorMaps {
  return useMemo(() => {
    if (!annotatorResult) return { codeId2CodeMap: {}, sentAnnoId2sentAnnoMap: {} };

    const codeId2CodeMap = annotatorResult.sentence_annotations[sentenceId].reduce(
      (acc, anno) => {
        acc[anno.code.id] = anno.code;
        return acc;
      },
      {} as Record<number, CodeRead>,
    );
    const sentAnnoId2sentAnnoMap = annotatorResult.sentence_annotations[sentenceId].reduce(
      (acc, anno) => {
        acc[anno.id] = anno;
        return acc;
      },
      {} as Record<number, SentenceAnnotationReadResolved>,
    );
    return { codeId2CodeMap, sentAnnoId2sentAnnoMap };
  }, [annotatorResult, sentenceId]);
}
interface DocumentSentenceProps {
  sentenceId: number;
  isSelected: boolean;
  selectedCode: CodeRead | undefined;
  hoveredSentAnnoId: number | null;
  hoveredCodeId: number | undefined;
  sentence: string;
  onAnnotationClick: (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    sentenceAnnotation: SentenceAnnotationReadResolved,
  ) => void;
  onAnnotationMouseEnter: (sentAnnoId: number) => void;
  onAnnotationMouseLeave: (sentAnnoId: number) => void;
  onSentenceMouseDown: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  onSentenceMouseEnter: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  onApplyAnnotation: (annotation: SentenceAnnotationReadResolved) => void;
  onRevertAnnotation: (annotation: SentenceAnnotationReadResolved) => void;
  numSentenceDigits: number;
  annotatorLeft: UseGetSentenceAnnotator;
  annotatorRight: UseGetSentenceAnnotator;
  isAnnotationAllowedLeft: boolean;
  isAnnotationAllowedRight: boolean;
}

const DocumentSentence = ({
  sentenceId,
  isSelected,
  selectedCode,
  hoveredSentAnnoId,
  hoveredCodeId,
  sentence,
  onAnnotationClick,
  onAnnotationMouseEnter,
  onAnnotationMouseLeave,
  onSentenceMouseEnter,
  onSentenceMouseDown,
  onApplyAnnotation,
  onRevertAnnotation,
  numSentenceDigits,
  annotatorLeft,
  annotatorRight,
  isAnnotationAllowedLeft,
  isAnnotationAllowedRight,
}: DocumentSentenceProps) => {
  const leftMaps = useComputeAnnotatorMaps(annotatorLeft.annotatorResult, sentenceId);
  const rightMaps = useComputeAnnotatorMaps(annotatorRight.annotatorResult, sentenceId);

  return (
    <Stack direction="row" width="100%">
      <DocumentSentencePart
        sentenceId={sentenceId}
        isSelected={isAnnotationAllowedLeft && isSelected}
        selectedCode={selectedCode}
        hoveredSentAnnoId={hoveredSentAnnoId}
        hoveredCodeId={hoveredCodeId}
        sentence={sentence}
        onAnnotationClick={onAnnotationClick}
        onAnnotationMouseEnter={onAnnotationMouseEnter}
        onAnnotationMouseLeave={onAnnotationMouseLeave}
        onSentenceMouseDown={isAnnotationAllowedLeft ? onSentenceMouseDown : undefined}
        onSentenceMouseEnter={isAnnotationAllowedLeft ? onSentenceMouseEnter : undefined}
        numSentenceDigits={numSentenceDigits}
        annotator={annotatorLeft}
        annotatorMaps={leftMaps}
      />

      {(isAnnotationAllowedLeft || isAnnotationAllowedRight) && (
        <AnnotationApplyPart
          isDirectionLeft={isAnnotationAllowedLeft}
          sentenceId={sentenceId}
          annotatorLeftMaps={leftMaps}
          annotatorLeft={annotatorLeft}
          annotatorRightMaps={rightMaps}
          annotatorRight={annotatorRight}
          onApplyAnnotation={onApplyAnnotation}
          onRevertAnnotation={onRevertAnnotation}
          onAnnotationMouseEnter={onAnnotationMouseEnter}
          onAnnotationMouseLeave={onAnnotationMouseLeave}
        />
      )}

      <DocumentSentencePart
        sentenceId={sentenceId}
        isSelected={isAnnotationAllowedRight && isSelected}
        selectedCode={selectedCode}
        hoveredSentAnnoId={hoveredSentAnnoId}
        hoveredCodeId={hoveredCodeId}
        sentence={sentence}
        onAnnotationClick={onAnnotationClick}
        onAnnotationMouseEnter={onAnnotationMouseEnter}
        onAnnotationMouseLeave={onAnnotationMouseLeave}
        onSentenceMouseDown={isAnnotationAllowedRight ? onSentenceMouseDown : undefined}
        onSentenceMouseEnter={isAnnotationAllowedRight ? onSentenceMouseEnter : undefined}
        numSentenceDigits={numSentenceDigits}
        annotator={annotatorRight}
        annotatorMaps={rightMaps}
      />
    </Stack>
  );
};

interface DocumentSentencePartProps {
  sentenceId: number;
  isSelected: boolean;
  selectedCode: CodeRead | undefined;
  hoveredSentAnnoId: number | null;
  hoveredCodeId: number | undefined;
  sentence: string;
  onAnnotationClick: (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    sentenceAnnotation: SentenceAnnotationReadResolved,
  ) => void;
  onAnnotationMouseEnter: (sentAnnoId: number) => void;
  onAnnotationMouseLeave: (sentAnnoId: number) => void;
  onSentenceMouseDown?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  onSentenceMouseEnter?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  numSentenceDigits: number;
  annotator: UseGetSentenceAnnotator;
  annotatorMaps: AnnotatorMaps;
}

const DocumentSentencePart = ({
  sentenceId,
  isSelected,
  selectedCode,
  hoveredSentAnnoId,
  hoveredCodeId,
  sentence,
  onAnnotationClick,
  onAnnotationMouseEnter,
  onAnnotationMouseLeave,
  onSentenceMouseEnter,
  onSentenceMouseDown,
  numSentenceDigits,
  annotator,
  annotatorMaps,
}: DocumentSentencePartProps) => {
  const highlightedColor = useMemo(() => {
    if (isSelected) {
      return selectedCode?.color || "rgb(255, 0, 0)";
    }
    if (hoveredSentAnnoId) {
      return annotatorMaps.sentAnnoId2sentAnnoMap[hoveredSentAnnoId]?.code.color;
    }
    if (hoveredCodeId) {
      return annotatorMaps.codeId2CodeMap[hoveredCodeId]?.color;
    }
  }, [
    hoveredCodeId,
    hoveredSentAnnoId,
    isSelected,
    annotatorMaps.codeId2CodeMap,
    annotatorMaps.sentAnnoId2sentAnnoMap,
    selectedCode?.color,
  ]);

  return (
    <>
      <div
        style={{
          paddingRight: "8px",
          borderLeft: "1px solid #e8eaed",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      />
      <div
        style={{
          flexShrink: 0,
          alignSelf: "stretch",
          paddingTop: "8px",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      >
        {String(sentenceId + 1).padStart(numSentenceDigits, "0")}
      </div>
      <div
        style={{
          paddingRight: "8px",
          borderRight: "1px solid #e8eaed",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      />
      <ListItemButton
        onMouseDown={onSentenceMouseDown ? (event) => onSentenceMouseDown(event, sentenceId) : undefined}
        onMouseEnter={onSentenceMouseEnter ? (event) => onSentenceMouseEnter(event, sentenceId) : undefined}
        style={{ flexGrow: 1 }}
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
                backgroundImage: `linear-gradient(to right, ${ColorUtils.colorStringToRGBA(
                  highlightedColor,
                  1,
                )}, ${ColorUtils.colorStringToRGBA(highlightedColor, 0.7)} 4%, ${ColorUtils.colorStringToRGBA(
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
      {Array.from({ length: annotator.numPositions + 1 }, (_, i) => i).map((annoPosition) => {
        let annoId: number | null = null;
        if (annotator.annotationPositions[sentenceId]) {
          annoId = annotator.annotationPositions[sentenceId][annoPosition] || null;
        }
        const key = `${sentenceId}-${annoPosition}`;
        if (annoId) {
          const annotation = annotatorMaps.sentAnnoId2sentAnnoMap[annoId];
          const isStartOfAnnotation = sentenceId === annotation.sentence_id_start;
          const isEndOfAnnotation = sentenceId === annotation.sentence_id_end;
          return (
            <Tooltip key={key} title={annotation.code.name} placement="top">
              <div
                onClick={(event) => onAnnotationClick(event, annotation)}
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
    </>
  );
};

const isAnnotationSame = (anno1: SentenceAnnotationReadResolved, anno2: SentenceAnnotationReadResolved) => {
  return (
    anno1.code.id === anno2.code.id &&
    anno1.sentence_id_start === anno2.sentence_id_start &&
    anno1.sentence_id_end === anno2.sentence_id_end
  );
};

interface AnnotationApplyPartProps {
  isDirectionLeft: boolean;
  sentenceId: number;
  annotatorLeftMaps: AnnotatorMaps;
  annotatorLeft: UseGetSentenceAnnotator;
  annotatorRightMaps: AnnotatorMaps;
  annotatorRight: UseGetSentenceAnnotator;
  onApplyAnnotation: (annotation: SentenceAnnotationReadResolved) => void;
  onRevertAnnotation: (annotation: SentenceAnnotationReadResolved) => void;
  onAnnotationMouseEnter: (sentAnnoId: number) => void;
  onAnnotationMouseLeave: (sentAnnoId: number) => void;
}

const AnnotationApplyPart = ({
  isDirectionLeft,
  sentenceId,
  annotatorLeftMaps,
  annotatorLeft,
  annotatorRight,
  annotatorRightMaps,
  onApplyAnnotation,
  onRevertAnnotation,
  onAnnotationMouseEnter,
  onAnnotationMouseLeave,
}: AnnotationApplyPartProps) => {
  return (
    <>
      <div
        style={{
          paddingRight: "8px",
          borderRight: "1px solid #e8eaed",
        }}
      />
      <div
        style={{
          flexShrink: 0,
          width: 164,
          alignSelf: "center",
        }}
      >
        {isDirectionLeft
          ? Array.from({ length: annotatorRight.numPositions + 1 }, (_, i) => i).map((annoPosition) => {
              const leftAnnotations = annotatorLeft.annotatorResult?.sentence_annotations[sentenceId] || [];
              let annoId: number | null = null;
              if (annotatorRight.annotationPositions[sentenceId]) {
                annoId = annotatorRight.annotationPositions[sentenceId][annoPosition] || null;
              }
              const key = `${sentenceId}-${annoPosition}`;
              if (annoId) {
                const annotation = annotatorRightMaps.sentAnnoId2sentAnnoMap[annoId];
                const isStartOfAnnotation = sentenceId === annotation.sentence_id_start;
                const sameAnnotation = leftAnnotations.find((leftAnno) => isAnnotationSame(annotation, leftAnno));
                if (isStartOfAnnotation) {
                  return (
                    <Box
                      key={key}
                      onMouseEnter={() => onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)}
                      onMouseLeave={() => onAnnotationMouseLeave(sameAnnotation ? sameAnnotation.id : annotation.id)}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="center">
                        <IconButton
                          sx={{ p: 0.5, ml: -0.5 }}
                          disabled={!!sameAnnotation}
                          onClick={() => onApplyAnnotation(annotation)}
                          onMouseEnter={() =>
                            onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)
                          }
                        >
                          <ArrowBackIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          sx={{ p: 0.5 }}
                          disabled={!sameAnnotation}
                          onClick={() => onRevertAnnotation(sameAnnotation!)}
                          onMouseEnter={() =>
                            onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)
                          }
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                        <SquareIcon style={{ color: annotation.code.color }} fontSize="small" />
                      </Stack>
                    </Box>
                  );
                }
                return <div />;
              }
              return <div />;
            })
          : Array.from({ length: annotatorLeft.numPositions + 1 }, (_, i) => i).map((annoPosition) => {
              const rightAnnotations = annotatorRight.annotatorResult?.sentence_annotations[sentenceId] || [];
              let annoId: number | null = null;
              if (annotatorLeft.annotationPositions[sentenceId]) {
                annoId = annotatorLeft.annotationPositions[sentenceId][annoPosition] || null;
              }
              const key = `${sentenceId}-${annoPosition}`;
              if (annoId) {
                const annotation = annotatorLeftMaps.sentAnnoId2sentAnnoMap[annoId];
                const isStartOfAnnotation = sentenceId === annotation.sentence_id_start;
                const sameAnnotation = rightAnnotations.find((rightAnno) => isAnnotationSame(annotation, rightAnno));
                if (isStartOfAnnotation) {
                  return (
                    <Box
                      key={key}
                      onMouseEnter={() => onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)}
                      onMouseLeave={() => onAnnotationMouseLeave(sameAnnotation ? sameAnnotation.id : annotation.id)}
                    >
                      <Stack key={key} direction="row" alignItems="center" justifyContent="center">
                        <SquareIcon style={{ color: annotation.code.color }} fontSize="small" />
                        <IconButton
                          sx={{ p: 0.5 }}
                          disabled={!!sameAnnotation}
                          onClick={() => onApplyAnnotation(annotation)}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          sx={{ p: 0.5, ml: -0.5 }}
                          disabled={!sameAnnotation}
                          onClick={() => onRevertAnnotation(sameAnnotation!)}
                        >
                          <ArrowForwardIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  );
                }
                return <div />;
              }
              return <div />;
            })}
      </div>
    </>
  );
};

export default SentenceAnnotationComparison;
