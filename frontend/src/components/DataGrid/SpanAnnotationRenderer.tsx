import { Stack } from "@mui/material";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks";
import { SpanAnnotationReadResolved } from "../../api/openapi";
import CodeRenderer from "./CodeRenderer";

interface SpanAnnotationRendererSharedProps {
  showCode?: boolean;
  showSpanText?: boolean;
}

interface SpanAnnotationRendererProps {
  spanAnnotation: number | SpanAnnotationReadResolved;
}

function SpanAnnotationRenderer({
  spanAnnotation,
  showCode = true,
  showSpanText = true,
}: SpanAnnotationRendererProps & SpanAnnotationRendererSharedProps) {
  if (typeof spanAnnotation === "number") {
    return (
      <SpanAnnotationRendererWithoutData
        spanAnnotationId={spanAnnotation}
        showCode={showCode}
        showSpanText={showSpanText}
      />
    );
  } else {
    return (
      <SpanAnnotationRendererWithData spanAnnotation={spanAnnotation} showCode={showCode} showSpanText={showSpanText} />
    );
  }
}

function SpanAnnotationRendererWithoutData({
  spanAnnotationId,
  showCode,
  showSpanText,
}: { spanAnnotationId: number } & SpanAnnotationRendererSharedProps) {
  const spanAnnotation = SpanAnnotationHooks.useGetAnnotation(spanAnnotationId);

  if (spanAnnotation.isSuccess) {
    return (
      <SpanAnnotationRendererWithData
        spanAnnotation={spanAnnotation.data}
        showCode={showCode}
        showSpanText={showSpanText}
      />
    );
  } else if (spanAnnotation.isError) {
    return <div>{spanAnnotation.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SpanAnnotationRendererWithData({
  spanAnnotation,
  showCode,
  showSpanText,
}: { spanAnnotation: SpanAnnotationReadResolved } & SpanAnnotationRendererSharedProps) {
  return (
    <Stack direction="row" alignItems="center">
      {showCode && <CodeRenderer code={spanAnnotation.code} />}
      {showCode && showSpanText && ": "}
      {showSpanText && spanAnnotation.span_text}
    </Stack>
  );
}

export default SpanAnnotationRenderer;
