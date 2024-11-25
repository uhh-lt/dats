import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ClearIcon from "@mui/icons-material/Clear";
import SquareIcon from "@mui/icons-material/Square";
import {
  Box,
  BoxProps,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemButtonProps,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
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

const isAnnotationSame = (anno1: SentenceAnnotationReadResolved, anno2: SentenceAnnotationReadResolved) => {
  return (
    anno1.code.id === anno2.code.id &&
    anno1.sentence_id_start === anno2.sentence_id_start &&
    anno1.sentence_id_end === anno2.sentence_id_end
  );
};

interface SentenceAnnotationComparisonProps {
  sdocData: SourceDocumentDataRead;
}

const SentenceAnnotationComparison = ({ sdocData, ...props }: SentenceAnnotationComparisonProps & BoxProps) => {
  // auth state
  const user = useAuth().user;

  // global client state (redux)
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const compareWithUserId = useAppSelector((state) => state.annotations.compareWithUserId);

  // global server state (react-query)
  const annotatorLeft = useGetSentenceAnnotator({ sdocId: sdocData.id, userId: visibleUserId });
  const annotatorRight = useGetSentenceAnnotator({ sdocId: sdocData.id, userId: compareWithUserId });

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
  const createMutation = useCreateSentenceAnnotation(visibleUserId ? [visibleUserId] : [], user!.id);
  const deleteMutation = useDeleteSentenceAnnotation(visibleUserId ? [visibleUserId] : []);
  const updateMutation = useUpdateSentenceAnnotation(visibleUserId ? [visibleUserId] : []);
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
    if (!annotatorLeft.annotatorResult) return;

    // annotation to display
    const annotation = annotatorLeft.annotatorResult.sentence_annotations[sentenceIdx].find(
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

  if (annotatorLeft.annotatorResult !== undefined) {
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
            <Stack direction="row" width="100%">
              <div
                style={{
                  paddingRight: "8px",
                  borderLeft: "1px solid #e8eaed",
                }}
              />
              <div
                style={{
                  flexShrink: 0,
                  alignSelf: "center",
                  color: "transparent",
                }}
              >
                {String(0).padStart(numSentenceDigits, "0")}
              </div>
              <div
                style={{
                  paddingRight: "8px",
                  borderRight: "1px solid #e8eaed",
                }}
              />
              <Typography style={{ flexGrow: 1, flexBasis: 1, paddingLeft: "16px" }} variant="h6">
                {visibleUserId ? (
                  <Stack direction="row" alignItems="center">
                    <UserRenderer user={visibleUserId} />
                    {"'s Annotations"}
                  </Stack>
                ) : (
                  "Select user first"
                )}
              </Typography>
              {Array.from({ length: annotatorLeft.numPositions }, (_, i) => i).map((annoPosition) => {
                return (
                  <div
                    key={annoPosition}
                    style={{ flexShrink: 0, borderRight: "4px solid transparent", paddingLeft: "16px" }}
                  />
                );
              })}
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
                  <Button>Revert</Button>
                  <Typography variant="button" color="primary">
                    |
                  </Typography>
                  <Button>Apply</Button>
                  <Typography variant="button" color="primary" sx={{ pr: 1 }}>
                    All
                  </Typography>
                </Stack>
              </div>
              <div
                style={{
                  paddingRight: "8px",
                  borderLeft: "1px solid #e8eaed",
                }}
              />
              <div
                style={{
                  flexShrink: 0,
                  alignSelf: "center",
                  color: "transparent",
                }}
              >
                {String(0).padStart(numSentenceDigits, "0")}
              </div>
              <div
                style={{
                  paddingRight: "8px",
                  borderRight: "1px solid #e8eaed",
                }}
              />
              <Typography style={{ flexGrow: 1, flexBasis: 1, paddingLeft: "16px" }} variant="h6">
                {compareWithUserId ? (
                  <Stack direction="row" alignItems="center">
                    <UserRenderer user={compareWithUserId} />
                    {"'s Annotations"}
                  </Stack>
                ) : (
                  "Select user first"
                )}
              </Typography>
              {Array.from({ length: annotatorRight.numPositions }, (_, i) => i).map((annoPosition) => {
                return (
                  <div
                    key={annoPosition}
                    style={{ flexShrink: 0, borderRight: "4px solid transparent", paddingLeft: "16px" }}
                  />
                );
              })}
            </Stack>
            {sdocData.sentences.map((sentence, sentenceId) => (
              <DocumentSentence
                key={sentenceId}
                sentenceId={sentenceId}
                sentence={sentence}
                isSelected={selectedSentences.includes(sentenceId)}
                selectedCode={mostRecentCode}
                onMouseDown={(event) => handleMouseDown(event, sentenceId)}
                onMouseEnter={() => handleMouseEnter(sentenceId)}
                onAnnotationClick={(event, sentAnnoId) => handleAnnotationClick(event, sentAnnoId, sentenceId)}
                onAnnotationMouseEnter={handleAnnotationMouseEnter}
                onAnnotationMouseLeave={handleAnnotationMouseLeave}
                hoveredSentAnnoId={hoverSentAnnoId}
                numSentenceDigits={numSentenceDigits}
                hoveredCodeId={hoveredCodeId}
                annotatorLeft={annotatorLeft}
                annotatorRight={annotatorRight}
                isAnnotationAllowedLeft={visibleUserId === user!.id}
                isAnnotationAllowedRight={compareWithUserId === user!.id}
              />
            ))}
          </List>
        </Box>
      </>
    );
  } else {
    return <>NULL</>;
  }
};

interface DocumentSentenceProps {
  sentenceId: number;
  isSelected: boolean;
  selectedCode: CodeRead | undefined;
  hoveredSentAnnoId: number | null;
  hoveredCodeId: number | undefined;
  sentence: string;
  onAnnotationClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentAnnoId: number) => void;
  onAnnotationMouseEnter: (sentAnnoId: number) => void;
  onAnnotationMouseLeave: (sentAnnoId: number) => void;
  numSentenceDigits: number;
  annotatorLeft: UseGetSentenceAnnotator;
  annotatorRight: UseGetSentenceAnnotator;
  isAnnotationAllowedLeft: boolean;
  isAnnotationAllowedRight: boolean;
}

function useComputeAnnotatorMaps(annotatorResult: SentenceAnnotatorResult | undefined, sentenceId: number) {
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
  numSentenceDigits,
  annotatorLeft,
  annotatorRight,
  isAnnotationAllowedLeft,
  isAnnotationAllowedRight,
  ...props
}: DocumentSentenceProps & ListItemButtonProps) => {
  console.log(isAnnotationAllowedLeft, isAnnotationAllowedRight);

  const leftMaps = useComputeAnnotatorMaps(annotatorLeft.annotatorResult, sentenceId);
  const rightMaps = useComputeAnnotatorMaps(annotatorRight.annotatorResult, sentenceId);

  const highlightedColorLeft = useMemo(() => {
    if (isSelected) {
      return selectedCode?.color || "rgb(255, 0, 0)";
    }
    if (hoveredSentAnnoId) {
      return leftMaps.sentAnnoId2sentAnnoMap[hoveredSentAnnoId]?.code.color;
    }
    if (hoveredCodeId) {
      return leftMaps.codeId2CodeMap[hoveredCodeId]?.color;
    }
  }, [
    hoveredCodeId,
    hoveredSentAnnoId,
    isSelected,
    leftMaps.codeId2CodeMap,
    leftMaps.sentAnnoId2sentAnnoMap,
    selectedCode?.color,
  ]);

  const highlightedColorRight = useMemo(() => {
    if (isSelected) {
      return selectedCode?.color || "rgb(255, 0, 0)";
    }
    if (hoveredSentAnnoId) {
      return rightMaps.sentAnnoId2sentAnnoMap[hoveredSentAnnoId]?.code.color;
    }
    if (hoveredCodeId) {
      return rightMaps.codeId2CodeMap[hoveredCodeId]?.color;
    }
  }, [
    hoveredCodeId,
    hoveredSentAnnoId,
    isSelected,
    rightMaps.codeId2CodeMap,
    rightMaps.sentAnnoId2sentAnnoMap,
    selectedCode?.color,
  ]);

  return (
    <Stack direction="row" width="100%">
      <div
        style={{
          paddingRight: "8px",
          borderLeft: "1px solid #e8eaed",
        }}
      />
      <div
        style={{
          flexShrink: 0,
          alignSelf: "center",
        }}
      >
        {String(sentenceId + 1).padStart(numSentenceDigits, "0")}
      </div>
      <div
        style={{
          paddingRight: "8px",
          borderRight: "1px solid #e8eaed",
        }}
      />
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
          {highlightedColorLeft ? (
            <mark
              data-sent-id={sentenceId}
              style={{
                margin: "0 -0.4em",
                padding: "0.18em 0.4em",
                borderRadius: "0.8em 0.3em",
                background: "transparent",
                backgroundImage: `linear-gradient(to right, ${ColorUtils.rgbStringToRGBA(
                  highlightedColorLeft,
                  1,
                )}, ${ColorUtils.rgbStringToRGBA(highlightedColorLeft, 0.7)} 4%, ${ColorUtils.rgbStringToRGBA(
                  highlightedColorLeft,
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
      {Array.from({ length: annotatorLeft.numPositions }, (_, i) => i).map((annoPosition) => {
        const annoId = annotatorLeft.annotationPositions[sentenceId][annoPosition] || null;
        const key = `${sentenceId}-${annoPosition}`;
        if (annoId) {
          const annotation = leftMaps.sentAnnoId2sentAnnoMap[annoId];
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
        {Array.from({ length: annotatorLeft.numPositions }, (_, i) => i).map((annoPosition) => {
          const rightAnnotations = annotatorRight.annotatorResult?.sentence_annotations[sentenceId] || [];

          const annoId = annotatorLeft.annotationPositions[sentenceId][annoPosition] || null;
          const key = `${sentenceId}-${annoPosition}`;
          if (annoId) {
            const annotation = leftMaps.sentAnnoId2sentAnnoMap[annoId];
            const isStartOfAnnotation = sentenceId === annotation.sentence_id_start;
            const isSame = rightAnnotations.some((rightAnno) => isAnnotationSame(annotation, rightAnno));
            if (isStartOfAnnotation) {
              return (
                <Box>
                  <Stack key={key} direction="row" alignItems="center" justifyContent="center">
                    <SquareIcon style={{ color: annotation.code.color }} fontSize="small" />
                    <IconButton sx={{ p: 0.5 }} disabled={!isSame}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                    <IconButton sx={{ p: 0.5, ml: -0.5 }} disabled={isSame}>
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
      <div
        style={{
          paddingRight: "8px",
          borderLeft: "1px solid #e8eaed",
        }}
      />

      <div
        style={{
          flexShrink: 0,
          alignSelf: "center",
        }}
      >
        {String(sentenceId + 1).padStart(numSentenceDigits, "0")}
      </div>
      <div
        style={{
          paddingRight: "8px",
          borderRight: "1px solid #e8eaed",
        }}
      />
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
          {highlightedColorRight ? (
            <mark
              data-sent-id={sentenceId}
              style={{
                margin: "0 -0.4em",
                padding: "0.18em 0.4em",
                borderRadius: "0.8em 0.3em",
                background: "transparent",
                backgroundImage: `linear-gradient(to right, ${ColorUtils.rgbStringToRGBA(
                  highlightedColorRight,
                  1,
                )}, ${ColorUtils.rgbStringToRGBA(highlightedColorRight, 0.7)} 4%, ${ColorUtils.rgbStringToRGBA(
                  highlightedColorRight,
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
      {Array.from({ length: annotatorRight.numPositions }, (_, i) => i).map((annoPosition) => {
        const annoId = annotatorRight.annotationPositions[sentenceId][annoPosition] || null;
        const key = `${sentenceId}-${annoPosition}`;
        if (annoId) {
          const annotation = leftMaps.sentAnnoId2sentAnnoMap[annoId];
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

export default SentenceAnnotationComparison;
