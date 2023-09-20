import { Stack } from "@mui/material";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks";
import { SpanAnnotationReadResolved } from "../../api/openapi";
import CodeRenderer from "./CodeRenderer";

interface SpanAnnotationRendererProps {
  spanAnnotation: number | SpanAnnotationReadResolved;
}

function SpanAnnotationRenderer({ spanAnnotation }: SpanAnnotationRendererProps) {
  if (typeof spanAnnotation === "number") {
    return <SpanAnnotationRendererWithoutData spanAnnotationId={spanAnnotation} />;
  } else {
    return <SpanAnnotationRendererWithData spanAnnotation={spanAnnotation} />;
  }
}

function SpanAnnotationRendererWithoutData({ spanAnnotationId }: { spanAnnotationId: number }) {
  const spanAnnotation = SpanAnnotationHooks.useGetAnnotation(spanAnnotationId);

  if (spanAnnotation.isSuccess) {
    return <SpanAnnotationRendererWithData spanAnnotation={spanAnnotation.data} />;
  } else if (spanAnnotation.isError) {
    return <div>{spanAnnotation.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SpanAnnotationRendererWithData({ spanAnnotation }: { spanAnnotation: SpanAnnotationReadResolved }) {
  return (
    <Stack direction="row" alignItems="center">
      <CodeRenderer code={spanAnnotation.code} />
      {": "}
      {spanAnnotation.span_text}
    </Stack>
  );
}

export default SpanAnnotationRenderer;
