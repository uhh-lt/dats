import { SourceDocumentDataRead } from "../../../api/openapi/models/SourceDocumentDataRead.ts";
import { SdocHooks } from "../../../api/SdocHooks.ts";

interface SdocSentenceRendererProps {
  sdoc: number | SourceDocumentDataRead;
  sentenceId: number;
}

export function SdocSentenceRenderer({ sdoc, sentenceId }: SdocSentenceRendererProps) {
  if (typeof sdoc === "number") {
    return <SdocSentenceRendererWithoutData sdocId={sdoc} sentenceId={sentenceId} />;
  }
  return <SdocSentenceRendererWithData sdocData={sdoc} sentenceId={sentenceId} />;
}

function SdocSentenceRendererWithoutData({ sdocId, sentenceId }: { sdocId: number; sentenceId: number }) {
  const sdocData = SdocHooks.useGetDocumentData(sdocId);

  if (sdocData.isSuccess) {
    return <SdocSentenceRendererWithData sdocData={sdocData.data} sentenceId={sentenceId} />;
  } else if (sdocData.isError) {
    return <div>{sdocData.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocSentenceRendererWithData({
  sdocData,
  sentenceId,
}: {
  sdocData: SourceDocumentDataRead;
  sentenceId: number;
}) {
  return <>{sdocData.sentences[sentenceId]}</>;
}
