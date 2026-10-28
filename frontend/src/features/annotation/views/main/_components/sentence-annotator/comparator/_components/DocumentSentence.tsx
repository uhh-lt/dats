import { AnnotatedSentence, SentAnnoMap, SentenceAnnotationResizeStartHandler } from "@core/annotation";
import { CodeMap } from "@core/code";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ClearIcon from "@mui/icons-material/Clear";
import SquareIcon from "@mui/icons-material/Square";
import { Box, IconButton, Stack } from "@mui/material";
import "../../../_styles/Annotation.css";
import { UseGetSentenceAnnotator } from "../../_hooks/useGetSentenceAnnotator";
import { useComputeSentAnnoMap } from "../_hooks/useComputeSentAnnoMap";
import { isAnnotationSame } from "../_utils/comparisonUtils";

interface DocumentSentenceProps {
  sentenceId: number;
  isSelected: boolean;
  // the side on which the current selection started; the highlight is shown only on that side
  selectionSide: "left" | "right" | null;
  hoveredSentAnnoId: number | null;
  hoveredCodeId: number | undefined;
  sentence: string;
  onAnnotationClick: (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    sentenceAnnotation: SentenceAnnotationRead,
  ) => void;
  onAnnotationMouseEnter: (sentAnnoId: number) => void;
  onAnnotationMouseLeave: (sentAnnoId: number) => void;
  onSentenceMouseDown: (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    sentenceId: number,
    side: "left" | "right",
    isAllowed: boolean,
  ) => void;
  onSentenceMouseEnter: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  onApplyAnnotation: (annotation: SentenceAnnotationRead) => void;
  onRevertAnnotation: (annotation: SentenceAnnotationRead) => void;
  numSentenceDigits: number;
  annotatorLeft: UseGetSentenceAnnotator;
  annotatorRight: UseGetSentenceAnnotator;
  isAnnotationAllowedLeft: boolean;
  isAnnotationAllowedRight: boolean;
  onResizeStartLeft?: SentenceAnnotationResizeStartHandler;
  onResizeStartRight?: SentenceAnnotationResizeStartHandler;
  codeMap: CodeMap;
}

export function DocumentSentence({
  sentenceId,
  isSelected,
  selectionSide,
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
  onResizeStartLeft,
  onResizeStartRight,
  codeMap,
}: DocumentSentenceProps) {
  const leftSentAnnoMap = useComputeSentAnnoMap(annotatorLeft.sentenceAnnotations, sentenceId);
  const rightSentAnnoMap = useComputeSentAnnoMap(annotatorRight.sentenceAnnotations, sentenceId);

  return (
    <Stack direction="row" width="100%" data-sent-id={sentenceId}>
      <AnnotatedSentence
        sentenceId={sentenceId}
        isSelected={selectionSide === "left" && isSelected}
        hoveredSentAnnoId={hoveredSentAnnoId}
        hoveredCodeId={hoveredCodeId}
        sentence={sentence}
        onAnnotationClick={onAnnotationClick}
        onAnnotationMouseEnter={onAnnotationMouseEnter}
        onAnnotationMouseLeave={onAnnotationMouseLeave}
        onSentenceMouseDown={(event, sid) => onSentenceMouseDown(event, sid, "left", isAnnotationAllowedLeft)}
        onSentenceMouseEnter={onSentenceMouseEnter}
        onResizeStart={isAnnotationAllowedLeft ? onResizeStartLeft : undefined}
        numSentenceDigits={numSentenceDigits}
        annotationPositions={annotatorLeft.annotationPositions[sentenceId]}
        numPositions={annotatorLeft.numPositions}
        sentAnnoMap={leftSentAnnoMap}
        codeMap={codeMap}
      />

      {(isAnnotationAllowedLeft || isAnnotationAllowedRight) && (
        <AnnotationApplyPart
          isDirectionLeft={isAnnotationAllowedLeft}
          sentenceId={sentenceId}
          annotatorLeftMap={leftSentAnnoMap}
          annotatorLeft={annotatorLeft}
          annotatorRightMap={rightSentAnnoMap}
          annotatorRight={annotatorRight}
          onApplyAnnotation={onApplyAnnotation}
          onRevertAnnotation={onRevertAnnotation}
          onAnnotationMouseEnter={onAnnotationMouseEnter}
          onAnnotationMouseLeave={onAnnotationMouseLeave}
          codeMap={codeMap}
        />
      )}

      <AnnotatedSentence
        sentenceId={sentenceId}
        isSelected={selectionSide === "right" && isSelected}
        hoveredSentAnnoId={hoveredSentAnnoId}
        hoveredCodeId={hoveredCodeId}
        sentence={sentence}
        onAnnotationClick={onAnnotationClick}
        onAnnotationMouseEnter={onAnnotationMouseEnter}
        onAnnotationMouseLeave={onAnnotationMouseLeave}
        onSentenceMouseDown={(event, sid) => onSentenceMouseDown(event, sid, "right", isAnnotationAllowedRight)}
        onSentenceMouseEnter={onSentenceMouseEnter}
        onResizeStart={isAnnotationAllowedRight ? onResizeStartRight : undefined}
        numSentenceDigits={numSentenceDigits}
        annotationPositions={annotatorRight.annotationPositions[sentenceId]}
        numPositions={annotatorRight.numPositions}
        sentAnnoMap={rightSentAnnoMap}
        codeMap={codeMap}
      />
    </Stack>
  );
}

interface AnnotationApplyPartProps {
  isDirectionLeft: boolean;
  sentenceId: number;
  annotatorLeftMap: SentAnnoMap;
  annotatorLeft: UseGetSentenceAnnotator;
  annotatorRightMap: SentAnnoMap;
  annotatorRight: UseGetSentenceAnnotator;
  onApplyAnnotation: (annotation: SentenceAnnotationRead) => void;
  onRevertAnnotation: (annotation: SentenceAnnotationRead) => void;
  onAnnotationMouseEnter: (sentAnnoId: number) => void;
  onAnnotationMouseLeave: (sentAnnoId: number) => void;
  codeMap: CodeMap;
}

function AnnotationApplyPart({
  isDirectionLeft,
  sentenceId,
  annotatorLeftMap,
  annotatorLeft,
  annotatorRight,
  annotatorRightMap,
  onApplyAnnotation,
  onRevertAnnotation,
  onAnnotationMouseEnter,
  onAnnotationMouseLeave,
  codeMap,
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
                const annotation = annotatorRightMap[annoId];
                const code = codeMap[annotation.code_id];
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
                          aria-label="Accept annotation"
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
                          aria-label="Remove annotation"
                          sx={{ p: 0.5 }}
                          disabled={!sameAnnotation}
                          onClick={() => onRevertAnnotation(sameAnnotation!)}
                          onMouseEnter={() =>
                            onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)
                          }
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                        <SquareIcon style={{ color: code.color }} fontSize="small" />
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
                const annotation = annotatorLeftMap[annoId];
                const code = codeMap[annotation.code_id];
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
                        <SquareIcon style={{ color: code.color }} fontSize="small" />
                        <IconButton
                          aria-label="Remove annotation"
                          sx={{ p: 0.5 }}
                          disabled={!sameAnnotation}
                          onClick={() => onRevertAnnotation(sameAnnotation!)}
                          onMouseEnter={() =>
                            onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)
                          }
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label="Accept annotation"
                          sx={{ p: 0.5, ml: -0.5 }}
                          disabled={!!sameAnnotation}
                          onClick={() => onApplyAnnotation(annotation)}
                          onMouseEnter={() =>
                            onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)
                          }
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
