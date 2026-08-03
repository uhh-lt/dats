import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { useAppSelector } from "@store/storeHooks";
import { range } from "lodash";
import { useMemo } from "react";
import { AnnotationRouteAPI } from "../../_hooks/annotationRouteAPI";
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
  // global client state (URL search params)
  const { selectedAnnotationId } = AnnotationRouteAPI.useSearch();

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

  const codeIndicator = useMemo(() => {
    const startingSpans = spans.filter((spanAnnotation) => spanAnnotation.begin_token === token.index);

    return startingSpans.length > 0 && tagStyle !== TagStyle.None ? (
      <span className={`spangroup ${tagStyle}`}>
        {startingSpans.map((spanAnnotation) => (
          <CodeIndicator
            key={spanAnnotation.id}
            codeId={spanAnnotation.code_id}
            annotationId={spanAnnotation.id}
            isSelected={selectedAnnotationId === spanAnnotation.id}
            groups={spanAnnotation.group_ids}
          />
        ))}{" "}
      </span>
    ) : null;
  }, [tagStyle, token, spans, selectedAnnotationId]);

  return (
    <>
      <span className={`tok ${spans.map((s) => `span-${s.id}`).join(" ")}`} data-tokenid={token.index}>
        {codeIndicator}
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
