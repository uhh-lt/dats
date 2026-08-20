import { CodeHooks } from "@api/hooks/CodeHooks";
import { Icon, getIconComponent } from "@components/icons";
import { AttachedMemoMenu } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { CircularProgress } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { range } from "lodash";
import { useMemo } from "react";
import { SpanAnnotationResizeStartHandler } from "../../_hooks/useSpanAnnotationResize";
import { IToken } from "../../_types/IToken";
import { TagStyle } from "../../_types/TagStyle";
import { CodeIndicator } from "./CodeIndicator";
import { Mark } from "./Mark";

interface TokenProps {
  spanAnnotations: SpanAnnotationRead[];
  token: IToken;
  onResizeStart?: SpanAnnotationResizeStartHandler;
}

export function Token({ token, spanAnnotations, onResizeStart }: TokenProps) {
  // global client state (redux)
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);

  // computed
  const spans = useMemo(
    () => spanAnnotations.filter((span) => hiddenCodeIds.indexOf(span.code_id) === -1),
    [spanAnnotations, hiddenCodeIds],
  );
  const marks = useMemo(() => {
    const markCount = spans.length;
    const h = 100 / markCount + "%";
    return spans.map((spanAnnotation, index) => (
      <Mark
        key={spanAnnotation.id}
        annotation={spanAnnotation}
        isStart={spanAnnotation.begin_token === token.index}
        isEnd={spanAnnotation.end_token === token.index + 1}
        height={h}
        top={(100 / markCount) * index + "%"}
        onResizeStart={onResizeStart}
      />
    ));
  }, [onResizeStart, token, spans]);

  // indicators for spans starting at this token: the memo count is rendered inside the code pill,
  // or — when code pills are hidden — as a standalone pill in the annotation's code color
  const indicators = useMemo(() => {
    const startingSpans = spans.filter((spanAnnotation) => spanAnnotation.begin_token === token.index);

    if (startingSpans.length === 0) {
      return null;
    }

    const showCodeIndicators = tagStyle !== TagStyle.None;

    return (
      <span className={`spangroup ${showCodeIndicators ? tagStyle : ""}`}>
        {startingSpans.map((spanAnnotation) =>
          showCodeIndicators ? (
            <CodeIndicator
              key={spanAnnotation.id}
              codeId={spanAnnotation.code_id}
              annotationId={spanAnnotation.id}
              groups={spanAnnotation.group_ids}
              memoCount={spanAnnotation.memo_ids.length}
            />
          ) : (
            spanAnnotation.memo_ids.length > 0 && <MemoTokenBadge key={spanAnnotation.id} annotation={spanAnnotation} />
          ),
        )}{" "}
      </span>
    );
  }, [tagStyle, token, spans]);

  return (
    <>
      <span className={`tok ${spans.map((s) => `span-${s.id}`).join(" ")}`} data-tokenid={token.index}>
        {indicators}
        <span id={"token" + token.index} className={"text"}>
          {token.text}
        </span>
        {token.whitespace && " "}
        {marks}
      </span>
      {token.newLine > 0 && range(token.newLine).map((i) => <br key={i}></br>)}
    </>
  );
}

interface MemoTokenBadgeProps {
  annotation: SpanAnnotationRead;
}

/**
 * A memo badge styled exactly like a code pill, in the annotation's code color.
 * Shown only when code pills are hidden (TagStyle.None), so the color tells you
 * which annotation the memo belongs to.
 */
function MemoTokenBadge({ annotation }: MemoTokenBadgeProps) {
  const code = CodeHooks.useGetCode(annotation.code_id);

  if (!code.data) {
    return null;
  }

  return (
    <AttachedMemoMenu
      attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
      attachedObjectId={annotation.id}
      renderTrigger={(handleClick, isFetching) => (
        <span
          className="code-indicator memo-badge"
          style={{ "--indicator-color": code.data.color } as React.CSSProperties}
          onClick={isFetching ? undefined : handleClick}
          title="Show attached memos"
        >
          <span className="code-indicator__text memo-badge__content">
            {isFetching ? (
              <CircularProgress size={12} />
            ) : (
              <>
                {getIconComponent(Icon.MEMO_ALT, { style: { fontSize: "inherit" } })}
                <span className="memo-badge__count">{annotation.memo_ids.length}</span>
              </>
            )}
          </span>
        </span>
      )}
    />
  );
}
