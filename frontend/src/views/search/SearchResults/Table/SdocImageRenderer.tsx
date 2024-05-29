import SdocHooks from "../../../../api/SdocHooks.ts";
import { DocType } from "../../../../api/openapi/models/DocType.ts";

interface SdocImageRendererProps {
  sdocId: number;
}

function SdocImageRenderer({ sdocId }: SdocImageRendererProps) {
  // global server state
  const sdoc = SdocHooks.useGetDocument(sdocId);

  if (sdoc.data?.doctype !== DocType.IMAGE) {
    return <>Hi</>;
  } else {
    return <SdocImage sdocId={sdocId} />;
  }
}

function SdocImage({ sdocId }: SdocImageRendererProps) {
  const thumbnailUrl = SdocHooks.useGetThumbnailURL(sdocId).data ?? "";

  return <img height="100%" width="100%" src={thumbnailUrl} alt={`Image for Document ${sdocId}`} />;
}

export default SdocImageRenderer;
