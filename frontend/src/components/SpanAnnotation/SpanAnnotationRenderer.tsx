import { Stack } from "@mui/material";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks.ts";
import { SpanAnnotationReadResolved } from "../../api/openapi/models/SpanAnnotationReadResolved.ts";
import CodeRenderer from "../Code/CodeRenderer.tsx";
import SdocMetadataRenderer from "../Metadata/SdocMetadataRenderer.tsx";
import SdocRenderer, { SdocRendererSharedProps } from "../SourceDocument/SdocRenderer.tsx";
import SdocTagsRenderer from "../SourceDocument/SdocTagRenderer.tsx";

interface SpanAnnotationRendererSharedProps {
  showCode?: boolean;
  showSpanText?: boolean;
  showSdoc?: boolean;
  showSdocTags?: boolean;
  showSdocProjectMetadataId?: number;
  sdocRendererProps?: SdocRendererSharedProps;
}

interface SpanAnnotationRendererProps {
  spanAnnotation: number | SpanAnnotationReadResolved;
}

function SpanAnnotationRenderer({
  spanAnnotation,
  showCode = true,
  showSpanText = true,
  ...props
}: SpanAnnotationRendererProps & SpanAnnotationRendererSharedProps) {
  if (typeof spanAnnotation === "number") {
    return (
      <SpanAnnotationRendererWithoutData
        spanAnnotationId={spanAnnotation}
        showCode={showCode}
        showSpanText={showSpanText}
        {...props}
      />
    );
  } else {
    return (
      <SpanAnnotationRendererWithData
        spanAnnotation={spanAnnotation}
        showCode={showCode}
        showSpanText={showSpanText}
        {...props}
      />
    );
  }
}

function SpanAnnotationRendererWithoutData({
  spanAnnotationId,
  ...props
}: { spanAnnotationId: number } & SpanAnnotationRendererSharedProps) {
  const spanAnnotation = SpanAnnotationHooks.useGetAnnotation(spanAnnotationId);

  if (spanAnnotation.isSuccess) {
    return <SpanAnnotationRendererWithData spanAnnotation={spanAnnotation.data} {...props} />;
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
  showSdoc,
  showSdocTags,
  showSdocProjectMetadataId,
  sdocRendererProps,
}: { spanAnnotation: SpanAnnotationReadResolved } & SpanAnnotationRendererSharedProps) {
  return (
    <Stack direction="row" alignItems="center">
      {showSdoc && <SdocRenderer sdoc={spanAnnotation.sdoc_id} {...sdocRendererProps} />}
      {showSdocTags && <SdocTagsRenderer sdocId={spanAnnotation.sdoc_id} />}
      {showSdocProjectMetadataId && (
        <SdocMetadataRenderer sdocId={spanAnnotation.sdoc_id} projectMetadataId={showSdocProjectMetadataId} />
      )}
      {showCode && <CodeRenderer code={spanAnnotation.code} />}
      {showCode && showSpanText && ": "}
      {showSpanText && spanAnnotation.span_text}
    </Stack>
  );
}

export default SpanAnnotationRenderer;
