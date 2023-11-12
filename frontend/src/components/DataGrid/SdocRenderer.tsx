import { Link, Stack } from "@mui/material";
import SdocHooks from "../../api/SdocHooks";
import { SourceDocumentRead } from "../../api/openapi";
import { docTypeToIcon } from "../../features/DocumentExplorer/docTypeToIcon";

interface SharedProps {
  link?: boolean;
  renderFilename?: boolean;
  renderDoctypeIcon?: boolean;
}

interface SdocRendererProps extends SharedProps {
  sdoc: number | SourceDocumentRead;
}

function SdocRenderer({ sdoc, ...props }: SdocRendererProps) {
  if (typeof sdoc === "number") {
    return <SdocRendererWithoutData sdocId={sdoc} {...props} />;
  } else {
    return <SdocRendererWithData sdoc={sdoc} {...props} />;
  }
}

function SdocRendererWithoutData({ sdocId, ...props }: { sdocId: number } & SharedProps) {
  const sdoc = SdocHooks.useGetDocument(sdocId);

  if (sdoc.isSuccess) {
    return <SdocRendererWithData sdoc={sdoc.data} {...props} />;
  } else if (sdoc.isError) {
    return <div>{sdoc.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocRendererWithData({
  sdoc,
  link,
  renderFilename,
  renderDoctypeIcon,
}: { sdoc: SourceDocumentRead } & SharedProps) {
  const content = (
    <Stack direction="row" alignItems="center">
      {renderDoctypeIcon && docTypeToIcon[sdoc.doctype]}
      {renderFilename && sdoc.filename}
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
