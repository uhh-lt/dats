import { ExpandableRenderer } from "@components/ExpandableRenderer";
import { AnnotationRendererSharedProps, AnnotationSummaryRow } from "@core/annotation";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { memo } from "react";
import { spanAnnotationQueries } from "../api/spanAnnotationQueries";

export type SpanAnnotationRendererSharedProps = AnnotationRendererSharedProps;

interface SpanAnnotationRendererProps extends SpanAnnotationRendererSharedProps {
  spanAnnotation: number | SpanAnnotationRead;
}

export const SpanAnnotationRenderer = memo(({ spanAnnotation, ...props }: SpanAnnotationRendererProps) => {
  if (typeof spanAnnotation === "number") {
    return <SpanAnnotationRendererWithoutData spanAnnotationId={spanAnnotation} {...props} />;
  } else {
    return <SpanAnnotationRendererWithData spanAnnotation={spanAnnotation} {...props} />;
  }
});

const SpanAnnotationRendererWithoutData = memo(
  ({ spanAnnotationId, ...props }: { spanAnnotationId: number } & SpanAnnotationRendererSharedProps) => {
    const spanAnnotation = useQuery(spanAnnotationQueries.byId(spanAnnotationId));

    if (spanAnnotation.isSuccess) {
      return <SpanAnnotationRendererWithData spanAnnotation={spanAnnotation.data} {...props} />;
    } else if (spanAnnotation.isError) {
      return <div>{spanAnnotation.error.message}</div>;
    } else {
      return <div>Loading...</div>;
    }
  },
);

const SpanAnnotationRendererWithData = memo(
  ({
    spanAnnotation,
    renderCode,
    renderText,
    renderSdoc,
    renderSdocTags,
    renderSdocProjectMetadataId,
    sdocRendererProps,
    link,
    renderMemoIndicator,
    ...expandProps
  }: { spanAnnotation: SpanAnnotationRead } & SpanAnnotationRendererSharedProps) => {
    return (
      <ExpandableRenderer {...expandProps} expandedContent={<SpanAnnotationContext spanAnnotation={spanAnnotation} />}>
        <AnnotationSummaryRow
          renderCode={renderCode}
          renderText={renderText}
          renderSdoc={renderSdoc}
          renderSdocTags={renderSdocTags}
          renderSdocProjectMetadataId={renderSdocProjectMetadataId}
          sdocRendererProps={sdocRendererProps}
          link={link}
          renderMemoIndicator={renderMemoIndicator}
          sdocId={spanAnnotation.sdoc_id}
          codeId={spanAnnotation.code_id}
          text={spanAnnotation.text}
          userId={spanAnnotation.user_id}
          annotationId={spanAnnotation.id}
          annotationType={AttachedObjectType.SPAN_ANNOTATION}
          memoIds={spanAnnotation.memo_ids}
        />
      </ExpandableRenderer>
    );
  },
);

function SpanAnnotationContext({ spanAnnotation }: { spanAnnotation: SpanAnnotationRead }) {
  return <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{spanAnnotation.text}</Typography>;
}
