import { ExpandableRenderer } from "@components/ExpandableRenderer";
import { AnnotationRendererSharedProps, AnnotationSummaryRow } from "@core/annotation";
import { SdocHooks } from "@core/source-document";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { CircularProgress, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { memo } from "react";
import { sentenceAnnotationQueries } from "../api/sentenceAnnotationQueries";

export type SentenceAnnotationRendererSharedProps = AnnotationRendererSharedProps;

interface SentenceAnnotationRendererProps extends SentenceAnnotationRendererSharedProps {
  sentenceAnnotation: number | SentenceAnnotationRead;
}

export const SentenceAnnotationRenderer = memo(({ sentenceAnnotation, ...props }: SentenceAnnotationRendererProps) => {
  if (typeof sentenceAnnotation === "number") {
    return <SentenceAnnotationRendererWithoutData sentenceAnnotationId={sentenceAnnotation} {...props} />;
  } else {
    return <SentenceAnnotationRendererWithData sentenceAnnotation={sentenceAnnotation} {...props} />;
  }
});

const SentenceAnnotationRendererWithoutData = memo(
  ({ sentenceAnnotationId, ...props }: { sentenceAnnotationId: number } & SentenceAnnotationRendererSharedProps) => {
    const sentenceAnnotation = useQuery(sentenceAnnotationQueries.byId(sentenceAnnotationId));

    if (sentenceAnnotation.isSuccess) {
      return <SentenceAnnotationRendererWithData sentenceAnnotation={sentenceAnnotation.data} {...props} />;
    } else if (sentenceAnnotation.isError) {
      return <div>{sentenceAnnotation.error.message}</div>;
    } else {
      return <div>Loading...</div>;
    }
  },
);

const SentenceAnnotationRendererWithData = memo(
  ({
    sentenceAnnotation,
    renderCode,
    renderText,
    renderSdoc,
    renderSdocTags,
    renderSdocProjectMetadataId,
    sdocRendererProps,
    link,
    renderMemoIndicator,
    ...expandProps
  }: { sentenceAnnotation: SentenceAnnotationRead } & SentenceAnnotationRendererSharedProps) => {
    return (
      <ExpandableRenderer
        {...expandProps}
        expandedContent={<SentenceAnnotationContext sentenceAnnotation={sentenceAnnotation} />}
      >
        <AnnotationSummaryRow
          renderCode={renderCode}
          renderText={renderText}
          renderSdoc={renderSdoc}
          renderSdocTags={renderSdocTags}
          renderSdocProjectMetadataId={renderSdocProjectMetadataId}
          sdocRendererProps={sdocRendererProps}
          link={link}
          renderMemoIndicator={renderMemoIndicator}
          sdocId={sentenceAnnotation.sdoc_id}
          codeId={sentenceAnnotation.code_id}
          text={
            <>
              This annotation spans sentences {sentenceAnnotation.sentence_id_start + 1} to{" "}
              {sentenceAnnotation.sentence_id_end + 1}.
            </>
          }
          userId={sentenceAnnotation.user_id}
          annotationId={sentenceAnnotation.id}
          annotationType={AttachedObjectType.SENTENCE_ANNOTATION}
          memoIds={sentenceAnnotation.memo_ids}
        />
      </ExpandableRenderer>
    );
  },
);

function SentenceAnnotationContext({ sentenceAnnotation }: { sentenceAnnotation: SentenceAnnotationRead }) {
  const sdocData = SdocHooks.useGetDocumentData(sentenceAnnotation.sdoc_id);

  if (sdocData.isLoading) {
    return <CircularProgress size={20} />;
  }
  if (sdocData.isError) {
    return <Typography color="error">{sdocData.error.message}</Typography>;
  }
  if (!sdocData.data) {
    return null;
  }

  const sentences = sdocData.data.sentences.slice(
    sentenceAnnotation.sentence_id_start,
    sentenceAnnotation.sentence_id_end + 1,
  );

  return (
    <Stack component="ol" spacing={1} sx={{ my: 0, pl: 3 }} start={sentenceAnnotation.sentence_id_start + 1}>
      {sentences.map((sentence, index) => (
        <Typography
          component="li"
          key={sentenceAnnotation.sentence_id_start + index}
          sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
        >
          {sentence}
        </Typography>
      ))}
    </Stack>
  );
}
