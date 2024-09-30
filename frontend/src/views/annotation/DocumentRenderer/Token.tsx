import { Tooltip, Typography } from "@mui/material";
import { range } from "lodash";
import { useMemo } from "react";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { TagStyle } from "../annoSlice.ts";
import { IToken } from "./IToken.ts";
import Mark from "./Mark.tsx";
import Tag from "./Tag.tsx";

interface TokenProps {
  spanAnnotations: SpanAnnotationReadResolved[];
  token: IToken;
}

function Token({ token, spanAnnotations }: TokenProps) {
  // global client state (redux)
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);

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
    return startingSpans.length > 0 && tagStyle !== TagStyle.None ? (
      <span className={`spangroup ${tagStyle}`}>
        {startingSpans.map((spanAnnotation) => (
          <Tag key={spanAnnotation.id} codeId={spanAnnotation.code.id} />
        ))}{" "}
      </span>
    ) : null;
  }, [tagStyle, token, spans]);

  return (
    <>
      <Tooltip
        title={
          spans.length > 0 && (
            <>
              {spans.map((span) => (
                <Typography fontSize="small">
                  {span.code.name}: {span.code.description}
                </Typography>
              ))}
            </>
          )
        }
        followCursor
        placement="top"
        enterDelay={500}
      >
        <span className={`tok ${spans.map((s) => `span-${s.id}`).join(" ")}`} data-tokenid={token.index}>
          {spanGroups}
          <span id={"token" + token.index} className={"text"}>
            {token.text}
          </span>
          {token.whitespace && " "}
          {marks}
        </span>
      </Tooltip>
      {token.newLine > 0 && range(token.newLine).map((i) => <br key={i}></br>)}
    </>
  );
}

export default Token;
