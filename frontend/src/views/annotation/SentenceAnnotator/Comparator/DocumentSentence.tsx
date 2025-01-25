import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ClearIcon from "@mui/icons-material/Clear";
import SquareIcon from "@mui/icons-material/Square";
import { Box, IconButton, ListItemButton, Stack, Tooltip } from "@mui/material";
import { useMemo } from "react";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { SentenceAnnotationReadResolved } from "../../../../api/openapi/models/SentenceAnnotationReadResolved.ts";
import ColorUtils from "../../../../utils/ColorUtils.ts";
import { UseGetSentenceAnnotator } from "../useGetSentenceAnnotator.ts";
import { isAnnotationSame } from "./comparisonUtils.ts";
import { AnnotatorMaps, useComputeAnnotatorMaps } from "./useComputeAnnotatorMaps.ts";

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

function DocumentSentence({
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
}: DocumentSentenceProps) {
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
}

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

function DocumentSentencePart({
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
}: DocumentSentencePartProps) {
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
}

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

function AnnotationApplyPart({
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
}: AnnotationApplyPartProps) {
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
                return <div key={key} />;
              }
              return <div key={key} />;
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
                return <div key={key} />;
              }
              return <div key={key} />;
            })}
      </div>
    </>
  );
}

export default DocumentSentence;
