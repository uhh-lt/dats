import { SentenceAnnotationHooks } from "@api/hooks/SentenceAnnotationHooks";
import { SentenceAnnotationRead } from "@api/models/SentenceAnnotationRead";
import { LinkWrapper } from "@components/links";
import { CodeRenderer } from "@core/code";
import { SdocMetadataRenderer } from "@core/sdoc-metadata";
import { SdocRenderer, SdocRendererSharedProps, SdocTagsRenderer } from "@core/source-document";
import { AnnoActions } from "@features/annotation";
import { Stack } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { useCallback } from "react";

interface SentenceAnnotationRendererSharedProps {
  showCode?: boolean;
  showSpanText?: boolean;
  showSdoc?: boolean;
  showSdocTags?: boolean;
  showSdocProjectMetadataId?: number;
  sdocRendererProps?: SdocRendererSharedProps;
  link?: boolean;
}

interface SentenceAnnotationRendererProps {
  sentenceAnnotation: number | SentenceAnnotationRead;
}

export function SentenceAnnotationRenderer({
  sentenceAnnotation,
  ...props
}: SentenceAnnotationRendererProps & SentenceAnnotationRendererSharedProps) {
  if (typeof sentenceAnnotation === "number") {
    return <SentenceAnnotationRendererWithoutData sentenceAnnotationId={sentenceAnnotation} {...props} />;
  } else {
    return <SentenceAnnotationRendererWithData sentenceAnnotation={sentenceAnnotation} {...props} />;
  }
}

function SentenceAnnotationRendererWithoutData({
  sentenceAnnotationId,
  ...props
}: { sentenceAnnotationId: number } & SentenceAnnotationRendererSharedProps) {
  const sentenceAnnotation = SentenceAnnotationHooks.useGetAnnotation(sentenceAnnotationId);

  if (sentenceAnnotation.isSuccess) {
    return <SentenceAnnotationRendererWithData sentenceAnnotation={sentenceAnnotation.data} {...props} />;
  } else if (sentenceAnnotation.isError) {
    return <div>{sentenceAnnotation.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SentenceAnnotationRendererWithData({
  sentenceAnnotation,
  showCode,
  showSpanText,
  showSdoc,
  showSdocTags,
  showSdocProjectMetadataId,
  sdocRendererProps,
  link,
}: { sentenceAnnotation: SentenceAnnotationRead } & SentenceAnnotationRendererSharedProps) {
  const projectId = useAppSelector((state) => state.project.projectId);
  const dispatch = useAppDispatch();
  const handleClick = useCallback(() => {
    dispatch(AnnoActions.setSelectedAnnotationId(sentenceAnnotation.id));
    dispatch(AnnoActions.setVisibleUserId(sentenceAnnotation.user_id));
  }, [dispatch, sentenceAnnotation.id, sentenceAnnotation.user_id]);

  if (!projectId) {
    return <div>Error: This component requires a project ID.</div>;
  }
  return (
    <LinkWrapper
      to="/project/$projectId/annotation/$sdocId"
      params={{ projectId, sdocId: sentenceAnnotation.sdoc_id }}
      onClick={handleClick}
      link={!!link}
    >
      <Stack direction="row" alignItems="center">
        {showSdoc && <SdocRenderer sdoc={sentenceAnnotation.sdoc_id} {...sdocRendererProps} />}
        {showSdocTags && <SdocTagsRenderer sdocId={sentenceAnnotation.sdoc_id} />}
        {showSdocProjectMetadataId && (
          <SdocMetadataRenderer sdocId={sentenceAnnotation.sdoc_id} projectMetadataId={showSdocProjectMetadataId} />
        )}
        {showCode && <CodeRenderer code={sentenceAnnotation.code_id} />}
        {showCode && showSpanText && ": "}
        {showSpanText &&
          `This annotation spans sentences ${sentenceAnnotation.sentence_id_start + 1} to ${
            sentenceAnnotation.sentence_id_end + 1
          }.`}
      </Stack>
    </LinkWrapper>
  );
}
