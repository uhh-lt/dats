import SdocHooks from "../../api/SdocHooks.ts";
import { SourceDocumentWithDataRead } from "../../api/openapi/models/SourceDocumentWithDataRead.ts";

interface SdocSentenceRendererProps {
  sdoc: number | SourceDocumentWithDataRead;
  sentenceId: number;
}

function SdocSentenceRenderer({ sdoc, sentenceId }: SdocSentenceRendererProps) {
  if (typeof sdoc === "number") {
    return <SdocSentenceRendererWithoutData sdocId={sdoc} sentenceId={sentenceId} />;
  }
  return <SdocSentenceRendererWithData sdoc={sdoc} sentenceId={sentenceId} />;
}

function SdocSentenceRendererWithoutData({ sdocId, sentenceId }: { sdocId: number; sentenceId: number }) {
  const sdoc = SdocHooks.useGetDocument(sdocId);

  if (sdoc.isSuccess) {
    return <SdocSentenceRendererWithData sdoc={sdoc.data} sentenceId={sentenceId} />;
  } else if (sdoc.isError) {
    return <div>{sdoc.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocSentenceRendererWithData({ sdoc, sentenceId }: { sdoc: SourceDocumentWithDataRead; sentenceId: number }) {
  return <>{sdoc.sentences[sentenceId]}</>;
}

export default SdocSentenceRenderer;
