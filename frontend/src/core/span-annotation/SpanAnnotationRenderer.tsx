import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { ExpandableRenderer } from "@components/ExpandableRenderer";
import { AnnotationRendererSharedProps, AnnotationSummaryRow } from "@core/annotation";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { Typography } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { memo } from "react";

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
    const spanAnnotation = SpanAnnotationHooks.useGetAnnotation(spanAnnotationId);

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
    expandable,
    expandMaxHeight,
    expandButtonPosition,
    ...summaryProps
  }: { spanAnnotation: SpanAnnotationRead } & SpanAnnotationRendererSharedProps) => {
    const projectId = useAppSelector((state) => state.project.projectId);

    if (!projectId) {
      return <div>Error: This component requires a project ID.</div>;
    }

    return (
      <ExpandableRenderer
        expandable={expandable}
        expandMaxHeight={expandMaxHeight}
        expandButtonPosition={expandButtonPosition}
        expandedContent={<SpanAnnotationContext spanAnnotation={spanAnnotation} />}
      >
        <AnnotationSummaryRow
          {...summaryProps}
          sdocId={spanAnnotation.sdoc_id}
          codeId={spanAnnotation.code_id}
          text={spanAnnotation.text}
          projectId={projectId}
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
