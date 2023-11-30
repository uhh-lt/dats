import { useAppSelector } from "../../plugins/ReduxHooks";
import React, { useMemo } from "react";
import { range } from "lodash";
import { SpanAnnotationReadResolved } from "../../api/openapi";
import Mark from "./Mark";
import Tag from "./Tag";
import { IToken } from "./IToken";

interface TokenProps {
  spanAnnotations: SpanAnnotationReadResolved[];
  token: IToken;
}

function Token({ token, spanAnnotations }: TokenProps) {
  // global client state (redux)
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);
  const tagStyle = useAppSelector((state) => state.settings.annotator.tagStyle);

  // computed
  const spans = useMemo(
    () => spanAnnotations.filter((span) => hiddenCodeIds.indexOf(span.code.id) === -1),
    [spanAnnotations, hiddenCodeIds],
  );
  const marks = useMemo(() => {
    const markCount = spans.length;
    const h = 100 / markCount + "%";
    const isStart = spans.every((annotation) => annotation.begin_token === token.index);
    const isEnd = spans.every((annotation) => annotation.end_token === token.index + 1);
    return spans.map((spanAnnotation, index) => (
      <Mark
        key={spanAnnotation.id}
        codeId={spanAnnotation.code.id}
        isStart={isStart}
        isEnd={isEnd}
        height={h}
        top={(100 / markCount) * index + "%"}
      />
    ));
  }, [token, spans]);

  const spanGroups = useMemo(() => {
    const startingSpans = spans.filter((spanAnnotation) => spanAnnotation.begin_token === token.index);
    return startingSpans.length > 0 ? (
      <span className={`spangroup ${tagStyle}`}>
        {startingSpans.map((spanAnnotation) => (
          <Tag key={spanAnnotation.id} codeId={spanAnnotation.code.id} />
        ))}{" "}
      </span>
    ) : null;
  }, [tagStyle, token, spans]);

  return (
    <>
      <span className={`tok ${spans.map((s) => `span-${s.id}`).join(" ")}`} data-tokenid={token.index}>
        {spanGroups}
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

export default Token;
