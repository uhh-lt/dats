import { CodeMap } from "@core/code";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { ListItemButton, Tooltip } from "@mui/material";
import { ColorUtils } from "@utils/colors/ColorUtils";
import { useMemo } from "react";
import { SentAnnoMap, SentenceAnnotationResizeStartHandler } from "./annotationDocumentTypes";
import { SentenceAnnotationResizeHandles } from "./SentenceAnnotationResizeHandles";
import { SentenceMemoBadge } from "./SentenceMemoBadge";

// the browser-native selection color, used for the flat in-progress sentence selection (matches the span annotator)
const SELECTION_COLOR = "rgba(0, 120, 215, 0.3)";

/**
 * One side of a sentence row of the sentence annotation comparison: the sentence number, the
 * sentence text and one lane per annotation bar. Without handlers it renders read-only.
 */
interface AnnotatedSentenceProps {
  sentenceId: number;
  isSelected?: boolean;
  hoveredSentAnnoId?: number | null;
  hoveredCodeId?: number;
  sentence: string;
  onAnnotationClick?: (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    sentenceAnnotation: SentenceAnnotationRead,
  ) => void;
  onAnnotationMouseEnter?: (sentAnnoId: number) => void;
  onAnnotationMouseLeave?: (sentAnnoId: number) => void;
  onSentenceMouseDown?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  onSentenceMouseEnter?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  onResizeStart?: SentenceAnnotationResizeStartHandler;
  numSentenceDigits: number;
  /** The lanes of this sentence: lane → annotation id. */
  annotationPositions: Record<number, number> | undefined;
  /** The highest lane of the document; every sentence renders all lanes so the bars line up. */
  numPositions: number;
  /** The annotations of this sentence by id. */
  sentAnnoMap: SentAnnoMap;
  codeMap: CodeMap;
}

export function AnnotatedSentence({
  sentenceId,
  isSelected,
  hoveredSentAnnoId,
  hoveredCodeId,
  sentence,
  onAnnotationClick,
  onAnnotationMouseEnter,
  onAnnotationMouseLeave,
  onSentenceMouseEnter,
  onSentenceMouseDown,
  onResizeStart,
  numSentenceDigits,
  annotationPositions,
  numPositions,
  sentAnnoMap,
  codeMap,
}: AnnotatedSentenceProps) {
  const sentAnnoCodeIds = useMemo(() => Object.values(sentAnnoMap).map((anno) => anno.code_id), [sentAnnoMap]);

  // space-separated annotation IDs for the data-annotation-ids attribute (used by useSentenceAnnotationHighlight / useJumpToSentenceAnnotation).
  // Placed on this side's wrapper so the highlight only affects the side that actually owns the annotation.
  const annotationIdsAttr = useMemo(
    () =>
      Object.values(sentAnnoMap)
        .map((anno) => anno.id)
        .join(" "),
    [sentAnnoMap],
  );

  // the color of an existing/hovered annotation highlight (gradient mark). Not used for the selection.
  const highlightedColor = useMemo(() => {
    if (hoveredSentAnnoId) {
      const sa = sentAnnoMap[hoveredSentAnnoId];
      return codeMap[sa?.code_id]?.color;
    }
    if (hoveredCodeId && sentAnnoCodeIds.includes(hoveredCodeId)) {
      return codeMap[hoveredCodeId]?.color;
    }
  }, [hoveredSentAnnoId, hoveredCodeId, sentAnnoCodeIds, sentAnnoMap, codeMap]);

  return (
    <div
      style={{ display: "flex", flexDirection: "row", flexGrow: 1, flexBasis: 0, minWidth: 0, alignSelf: "stretch" }}
      data-annotation-ids={annotationIdsAttr}
    >
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
        style={{ flexGrow: 1, cursor: "text" }}
        data-sent-id={sentenceId}
        onFocus={(event) => {
          // prevent focus
          event.target.blur();
        }}
      >
        <div data-sent-id={sentenceId}>
          {isSelected ? (
            // the in-progress selection uses the flat browser-native selection style (no gradient/mark)
            <span data-sent-id={sentenceId} style={{ backgroundColor: SELECTION_COLOR }}>
              {sentence}
            </span>
          ) : highlightedColor ? (
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
                )}, ${ColorUtils.colorStringToRGBA(highlightedColor, 0.7)} 4%, ${ColorUtils.colorStringToRGBA(highlightedColor, 0.3)})`,
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
        let annoId: number | null = null;
        if (annotationPositions) {
          annoId = annotationPositions[annoPosition] || null;
        }
        const key = `${sentenceId}-${annoPosition}`;
        if (annoId) {
          const annotation = sentAnnoMap[annoId];
          if (!annotation) {
            return (
              <div key={key} style={{ flexShrink: 0, borderRight: "4px solid transparent", paddingLeft: "16px" }} />
            );
          }
          const code = codeMap[annotation.code_id];
          const isStartOfAnnotation = sentenceId === annotation.sentence_id_start;
          const isEndOfAnnotation = sentenceId === annotation.sentence_id_end;
          const isHovered = hoveredSentAnnoId === annotation.id;
          return (
            <Tooltip key={key} title={code.name} placement="right">
              <div
                onClick={onAnnotationClick ? (event) => onAnnotationClick(event, annotation) : undefined}
                onMouseEnter={onAnnotationMouseEnter ? () => onAnnotationMouseEnter(annoId) : undefined}
                onMouseLeave={onAnnotationMouseLeave ? () => onAnnotationMouseLeave(annoId) : undefined}
                style={{
                  flexShrink: 0,
                  cursor: onAnnotationClick ? "pointer" : undefined,
                  position: "relative",
                  zIndex: isHovered ? 100 : undefined,
                  paddingRight: "8px",
                  paddingTop: isStartOfAnnotation ? "4px" : undefined,
                  paddingBottom: isEndOfAnnotation ? "4px" : undefined,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    height: "100%",
                    borderTopRightRadius: isStartOfAnnotation ? "8px" : undefined,
                    borderBottomRightRadius: isEndOfAnnotation ? "8px" : undefined,
                    borderTop: isStartOfAnnotation ? `4px solid ${code.color}` : undefined,
                    borderBottom: isEndOfAnnotation ? `4px solid ${code.color}` : undefined,
                    borderRight: `4px solid ${code.color}`,
                    paddingLeft: "8px",
                  }}
                >
                  {onResizeStart && (
                    <SentenceAnnotationResizeHandles
                      annotation={annotation}
                      isStartOfAnnotation={isStartOfAnnotation}
                      isEndOfAnnotation={isEndOfAnnotation}
                      isHovered={isHovered}
                      color={code.color}
                      onResizeStart={onResizeStart}
                    />
                  )}
                  {isStartOfAnnotation && annotation.memo_ids.length > 0 && (
                    <SentenceMemoBadge annotation={annotation} color={code.color} />
                  )}
                </div>
              </div>
            </Tooltip>
          );
        }
        return <div key={key} style={{ flexShrink: 0, borderRight: "4px solid transparent", paddingLeft: "16px" }} />;
      })}
    </div>
  );
}
