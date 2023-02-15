import { useAppSelector } from "../../../plugins/ReduxHooks";
import React, { useMemo } from "react";
import { range } from "lodash";
import { IToken } from "./IToken";
import { SpanAnnotationReadResolved } from "../../../api/openapi";
import Mark from "./Mark";
import Tag from "./Tag";

interface TokenProps {
  spanAnnotations: SpanAnnotationReadResolved[];
  token: IToken;
  cssClassnames: string;
}

function Token({ token, spanAnnotations, cssClassnames }: TokenProps) {
  // global client state (redux)
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);
  const tagStyle = useAppSelector((state) => state.settings.annotator.tagStyle);

  // computed
  const spans = useMemo(
    () => spanAnnotations.filter((span) => hiddenCodeIds.indexOf(span.code.id) === -1),
    [spanAnnotations, hiddenCodeIds]
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

  const startingSpans = useMemo(
    () => spans.filter((spanAnnotation) => spanAnnotation.begin_token === token.index),
    [token, spans]
  );

  const spanGroups = startingSpans.length > 0 && (
    <span className={`spangroup ${tagStyle}`}>
      {startingSpans.map((spanAnnotation) => (
        <Tag key={spanAnnotation.id} codeId={spanAnnotation.code.id} />
      ))}{" "}
    </span>
  );

  return (
    <>
      <span className={`tok ${spans.map((s) => `span-${s.id}`).join(" ")}`} data-tokenid={token.index}>
        {spanGroups}
        <span className={"text " + cssClassnames}>{token.text}</span>
        {token.whitespace && " "}
        {marks}
      </span>
      {token.newLine > 0 && range(token.newLine).map((i) => <br key={i}></br>)}
    </>
  );
}

export default Token;
