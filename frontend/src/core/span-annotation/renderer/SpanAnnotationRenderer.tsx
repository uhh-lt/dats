import { Stack } from "@mui/material";
import { useCallback } from "react";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead.ts";
import { SpanAnnotationHooks } from "../../../api/SpanAnnotationHooks.ts";
import { LinkWrapper } from "../../../components/MUI/LinkWrapper.tsx";
import { AnnoActions } from "../../../features/annotation/annoSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { CodeRenderer } from "../../code/renderer/CodeRenderer.tsx";
import { SdocMetadataRenderer } from "../../sdoc-metadata/renderer/SdocMetadataRenderer.tsx";
import { SdocRenderer, SdocRendererSharedProps } from "../../source-document/renderer/SdocRenderer.tsx";
import { SdocTagsRenderer } from "../../source-document/renderer/SdocTagRenderer.tsx";

interface SpanAnnotationRendererSharedProps {
  showCode?: boolean;
  showSpanText?: boolean;
  showSdoc?: boolean;
  showSdocTags?: boolean;
  showSdocProjectMetadataId?: number;
  sdocRendererProps?: SdocRendererSharedProps;
  link?: boolean;
}

interface SpanAnnotationRendererProps {
  spanAnnotation: number | SpanAnnotationRead;
}

export function SpanAnnotationRenderer({
  spanAnnotation,
  ...props
}: SpanAnnotationRendererProps & SpanAnnotationRendererSharedProps) {
  if (typeof spanAnnotation === "number") {
    return <SpanAnnotationRendererWithoutData spanAnnotationId={spanAnnotation} {...props} />;
  } else {
    return <SpanAnnotationRendererWithData spanAnnotation={spanAnnotation} {...props} />;
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
  link,
}: { spanAnnotation: SpanAnnotationRead } & SpanAnnotationRendererSharedProps) {
  const projectId = useAppSelector((state) => state.project.projectId);
  const dispatch = useAppDispatch();
  const handleClick = useCallback(() => {
    dispatch(AnnoActions.setSelectedAnnotationId(spanAnnotation.id));
    dispatch(AnnoActions.setVisibleUserId(spanAnnotation.user_id));
  }, [dispatch, spanAnnotation.id, spanAnnotation.user_id]);

  if (!projectId) {
    return <div>Error: This component requires a project ID.</div>;
  }
  return (
    <LinkWrapper
      to="/project/$projectId/annotation/$sdocId"
      params={{ projectId, sdocId: spanAnnotation.sdoc_id }}
      onClick={handleClick}
      link={!!link}
    >
      <Stack direction="row" alignItems="center">
        {showSdoc && <SdocRenderer sdoc={spanAnnotation.sdoc_id} {...sdocRendererProps} />}
        {showSdocTags && <SdocTagsRenderer sdocId={spanAnnotation.sdoc_id} />}
        {showSdocProjectMetadataId && (
          <SdocMetadataRenderer sdocId={spanAnnotation.sdoc_id} projectMetadataId={showSdocProjectMetadataId} />
        )}
        {showCode && <CodeRenderer code={spanAnnotation.code_id} />}
        {showCode && showSpanText && ": "}
        {showSpanText && spanAnnotation.text}
      </Stack>
    </LinkWrapper>
  );
}
