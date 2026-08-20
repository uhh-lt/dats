import { BboxAnnotationHooks } from "@api/hooks/BboxAnnotationHooks";
import { CodeHooks } from "@api/hooks/CodeHooks";
import { SdocHooks } from "@api/hooks/SdocHooks";
import { ExpandableRenderer } from "@components/ExpandableRenderer";
import { ImageCropper } from "@components/ImageCropper";
import { AnnotationRendererSharedProps, AnnotationSummaryRow } from "@core/annotation";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { CircularProgress, Typography } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { memo } from "react";

export type BBoxAnnotationRendererSharedProps = AnnotationRendererSharedProps;

interface BBoxAnnotationRendererProps extends BBoxAnnotationRendererSharedProps {
  bboxAnnotation: number | BBoxAnnotationRead;
}

export const BBoxAnnotationRenderer = memo(({ bboxAnnotation, ...props }: BBoxAnnotationRendererProps) => {
  if (typeof bboxAnnotation === "number") {
    return <BBoxAnnotationRendererWithoutData bboxAnnotationId={bboxAnnotation} {...props} />;
  } else {
    return <BBoxAnnotationRendererWithData bboxAnnotation={bboxAnnotation} {...props} />;
  }
});

const BBoxAnnotationRendererWithoutData = memo(
  ({ bboxAnnotationId, ...props }: { bboxAnnotationId: number } & BBoxAnnotationRendererSharedProps) => {
    const bboxAnnotation = BboxAnnotationHooks.useGetAnnotation(bboxAnnotationId);

    if (bboxAnnotation.isSuccess) {
      return <BBoxAnnotationRendererWithData bboxAnnotation={bboxAnnotation.data} {...props} />;
    } else if (bboxAnnotation.isError) {
      return <div>{bboxAnnotation.error.message}</div>;
    } else {
      return <div>Loading...</div>;
    }
  },
);

const BBoxAnnotationRendererWithData = memo(
  ({
    bboxAnnotation,
    expandable,
    expandMaxHeight,
    expandButtonPosition,
    ...summaryProps
  }: { bboxAnnotation: BBoxAnnotationRead } & BBoxAnnotationRendererSharedProps) => {
    const projectId = useAppSelector((state) => state.project.projectId);

    if (!projectId) {
      return <div>Error: This component requires a project ID.</div>;
    }

    return (
      <ExpandableRenderer
        expandable={expandable}
        expandMaxHeight={expandMaxHeight}
        expandButtonPosition={expandButtonPosition}
        expandedContent={<BBoxAnnotationContext bboxAnnotation={bboxAnnotation} />}
      >
        <AnnotationSummaryRow
          {...summaryProps}
          sdocId={bboxAnnotation.sdoc_id}
          codeId={bboxAnnotation.code_id}
          text={
            <>
              {bboxAnnotation.x_min}, {bboxAnnotation.y_min}, {bboxAnnotation.x_max}, {bboxAnnotation.y_max}
            </>
          }
          projectId={projectId}
          userId={bboxAnnotation.user_id}
          annotationId={bboxAnnotation.id}
          annotationType={AttachedObjectType.BBOX_ANNOTATION}
          memoIds={bboxAnnotation.memo_ids}
        />
      </ExpandableRenderer>
    );
  },
);

function BBoxAnnotationContext({ bboxAnnotation }: { bboxAnnotation: BBoxAnnotationRead }) {
  const sdocData = SdocHooks.useGetDocumentData(bboxAnnotation.sdoc_id);
  const code = CodeHooks.useGetCode(bboxAnnotation.code_id);

  if (sdocData.isLoading || code.isLoading) {
    return <CircularProgress size={20} />;
  }
  if (sdocData.isError) {
    return <Typography color="error">{sdocData.error.message}</Typography>;
  }
  if (code.isError) {
    return <Typography color="error">{code.error.message}</Typography>;
  }
  if (!sdocData.data || !code.data) {
    return null;
  }

  const width = bboxAnnotation.x_max - bboxAnnotation.x_min;
  const height = bboxAnnotation.y_max - bboxAnnotation.y_min;
  const targetHeight = Math.min(height, 240);
  const targetWidth = (width * targetHeight) / height;

  return (
    <ImageCropper
      imageUrl={encodeURI(`/content/${sdocData.data.repo_url}`)}
      x={bboxAnnotation.x_min}
      y={bboxAnnotation.y_min}
      width={width}
      height={height}
      targetWidth={targetWidth}
      targetHeight={targetHeight}
      style={{ border: `4px solid ${code.data.color}`, maxWidth: "100%" }}
    />
  );
}
