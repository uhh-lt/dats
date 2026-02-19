import { Stack } from "@mui/material";
import { Link } from "@tanstack/react-router";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import { BBoxAnnotationRead } from "../../api/openapi/models/BBoxAnnotationRead.ts";
import CodeRenderer from "../Code/CodeRenderer.tsx";
import SdocMetadataRenderer from "../Metadata/SdocMetadataRenderer.tsx";
import SdocRenderer, { SdocRendererSharedProps } from "../SourceDocument/SdocRenderer.tsx";
import SdocTagsRenderer from "../SourceDocument/SdocTagRenderer.tsx";

interface BBoxAnnotationRendererSharedProps {
  showCode?: boolean;
  showSpanText?: boolean;
  showSdoc?: boolean;
  showSdocTags?: boolean;
  showSdocProjectMetadataId?: number;
  sdocRendererProps?: SdocRendererSharedProps;
  link?: boolean;
}

interface BBoxAnnotationRendererProps {
  bboxAnnotation: number | BBoxAnnotationRead;
}

function BBoxAnnotationRenderer({
  bboxAnnotation,
  ...props
}: BBoxAnnotationRendererProps & BBoxAnnotationRendererSharedProps) {
  if (typeof bboxAnnotation === "number") {
    return <BBoxAnnotationRendererWithoutData bboxAnnotationId={bboxAnnotation} {...props} />;
  } else {
    return <BBoxAnnotationRendererWithData bboxAnnotation={bboxAnnotation} {...props} />;
  }
}

function BBoxAnnotationRendererWithoutData({
  bboxAnnotationId,
  ...props
}: { bboxAnnotationId: number } & BBoxAnnotationRendererSharedProps) {
  const bboxAnnotation = BboxAnnotationHooks.useGetAnnotation(bboxAnnotationId);

  if (bboxAnnotation.isSuccess) {
    return <BBoxAnnotationRendererWithData bboxAnnotation={bboxAnnotation.data} {...props} />;
  } else if (bboxAnnotation.isError) {
    return <div>{bboxAnnotation.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function LinkWrapper({
  children,
  to,
  link,
  sdocId,
}: {
  children: React.ReactNode;
  to: string;
  sdocId: number;
  link: boolean;
}) {
  if (link) {
    return (
      <Link to={to} params={{ sdocId }}>
        {children}
      </Link>
    );
  }
  return children;
}

function BBoxAnnotationRendererWithData({
  bboxAnnotation,
  showCode,
  showSpanText,
  showSdoc,
  showSdocTags,
  showSdocProjectMetadataId,
  sdocRendererProps,
  link,
}: { bboxAnnotation: BBoxAnnotationRead } & BBoxAnnotationRendererSharedProps) {
  return (
    <LinkWrapper to="/annotation/$sdocId" sdocId={bboxAnnotation.sdoc_id} link={!!link}>
      <Stack direction="row" alignItems="center">
        {showSdoc && <SdocRenderer sdoc={bboxAnnotation.sdoc_id} {...sdocRendererProps} />}
        {showSdocTags && <SdocTagsRenderer sdocId={bboxAnnotation.sdoc_id} />}
        {showSdocProjectMetadataId && (
          <SdocMetadataRenderer sdocId={bboxAnnotation.sdoc_id} projectMetadataId={showSdocProjectMetadataId} />
        )}
        {showCode && <CodeRenderer code={bboxAnnotation.code_id} />}
        {showCode && showSpanText && ": "}
        {showSpanText &&
          `${bboxAnnotation.x_min}, ${bboxAnnotation.y_min}, ${bboxAnnotation.x_max}, ${bboxAnnotation.y_max}`}
      </Stack>
    </LinkWrapper>
  );
}

export default BBoxAnnotationRenderer;
