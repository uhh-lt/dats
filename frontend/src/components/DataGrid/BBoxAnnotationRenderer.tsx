import { Stack } from "@mui/material";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import { BBoxAnnotationReadResolvedCode } from "../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import CodeRenderer from "./CodeRenderer.tsx";

interface BBoxAnnotationRendererProps {
  bboxAnnotation: number | BBoxAnnotationReadResolvedCode;
}

function BBoxAnnotationRenderer({ bboxAnnotation }: BBoxAnnotationRendererProps) {
  if (typeof bboxAnnotation === "number") {
    return <BBoxAnnotationRendererWithoutData bboxAnnotationId={bboxAnnotation} />;
  } else {
    return <BBoxAnnotationRendererWithData bboxAnnotation={bboxAnnotation} />;
  }
}

function BBoxAnnotationRendererWithoutData({ bboxAnnotationId }: { bboxAnnotationId: number }) {
  const bboxAnnotation = BboxAnnotationHooks.useGetAnnotation(bboxAnnotationId);

  if (bboxAnnotation.isSuccess) {
    return <BBoxAnnotationRendererWithData bboxAnnotation={bboxAnnotation.data} />;
  } else if (bboxAnnotation.isError) {
    return <div>{bboxAnnotation.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function BBoxAnnotationRendererWithData({ bboxAnnotation }: { bboxAnnotation: BBoxAnnotationReadResolvedCode }) {
  return (
    <Stack direction="row" alignItems="center">
      <CodeRenderer code={bboxAnnotation.code} />
      {": "}
      {`${bboxAnnotation.x_min}, ${bboxAnnotation.y_min}, ${bboxAnnotation.x_max}, ${bboxAnnotation.y_max}`}
    </Stack>
  );
}

export default BBoxAnnotationRenderer;
