import { Link, Stack } from "@mui/material";
import SdocHooks from "../../api/SdocHooks";
import { SourceDocumentRead } from "../../api/openapi";
import { docTypeToIcon } from "../../features/DocumentExplorer/docTypeToIcon";

interface SdocRendererProps {
  sdoc: number | SourceDocumentRead;
  link: boolean;
}

function SdocRenderer({ sdoc, link }: SdocRendererProps) {
  if (typeof sdoc === "number") {
    return <SdocRendererWithoutData sdocId={sdoc} link={link} />;
  } else {
    return <SdocRendererWithData sdoc={sdoc} link={link} />;
  }
}

function SdocRendererWithoutData({ sdocId, link }: { sdocId: number; link: boolean }) {
  const sdoc = SdocHooks.useGetDocument(sdocId);

  if (sdoc.isSuccess) {
    return <SdocRendererWithData sdoc={sdoc.data} link={link} />;
  } else if (sdoc.isError) {
    return <div>{sdoc.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocRendererWithData({ sdoc, link }: { sdoc: SourceDocumentRead; link: boolean }) {
  const content = (
    <Stack direction="row" alignItems="center">
      {docTypeToIcon[sdoc.doctype]}
      {sdoc.filename}
    </Stack>
  );

  if (link) {
    return (
      <Link href={`../search/doc/${sdoc.id}`} target="_blank">
        {content}
      </Link>
    );
  }
  return content;
}

export default SdocRenderer;