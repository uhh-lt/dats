import { SdocHooks } from "@api/hooks/SdocHooks";
import { ExpandableRenderer, ExpandableRendererProps } from "@components/ExpandableRenderer";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { Stack, Typography } from "@mui/material";
import { memo } from "react";

export type SdocSentenceRendererSharedProps = ExpandableRendererProps;

interface SdocSentenceRendererProps extends SdocSentenceRendererSharedProps {
  sdoc: number | SourceDocumentDataRead;
  sentenceId: number;
}

export const SdocSentenceRenderer = memo(({ sdoc, sentenceId, ...props }: SdocSentenceRendererProps) => {
  if (typeof sdoc === "number") {
    return <SdocSentenceRendererWithoutData sdocId={sdoc} sentenceId={sentenceId} {...props} />;
  }
  return <SdocSentenceRendererWithData sdocData={sdoc} sentenceId={sentenceId} {...props} />;
});

const SdocSentenceRendererWithoutData = memo(
  ({ sdocId, sentenceId, ...props }: { sdocId: number; sentenceId: number } & SdocSentenceRendererSharedProps) => {
    const sdocData = SdocHooks.useGetDocumentData(sdocId);

    if (sdocData.isSuccess) {
      return <SdocSentenceRendererWithData sdocData={sdocData.data} sentenceId={sentenceId} {...props} />;
    } else if (sdocData.isError) {
      return <div>{sdocData.error.message}</div>;
    } else {
      return <div>Loading...</div>;
    }
  },
);

const SdocSentenceRendererWithData = memo(
  ({
    sdocData,
    sentenceId,
    ...expandProps
  }: {
    sdocData: SourceDocumentDataRead;
    sentenceId: number;
  } & SdocSentenceRendererSharedProps) => {
    return (
      <ExpandableRenderer
        {...expandProps}
        expandedContent={<SdocSentenceContext sdocData={sdocData} sentenceId={sentenceId} />}
      >
        <Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%" overflow="hidden">
          <Typography component="span" noWrap minWidth={0}>
            {sdocData.sentences[sentenceId]}
          </Typography>
        </Stack>
      </ExpandableRenderer>
    );
  },
);

function SdocSentenceContext({ sdocData, sentenceId }: { sdocData: SourceDocumentDataRead; sentenceId: number }) {
  const start = Math.max(0, sentenceId - 2);
  const end = Math.min(sdocData.sentences.length, sentenceId + 3);
  const sentences = sdocData.sentences.slice(start, end);

  return (
    <Stack component="ol" spacing={1} sx={{ my: 0, pl: 3 }} start={start + 1}>
      {sentences.map((sentence, index) => (
        <Typography
          component="li"
          key={start + index}
          sx={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontWeight: start + index === sentenceId ? "bold" : "normal",
          }}
        >
          {sentence}
        </Typography>
      ))}
    </Stack>
  );
}
