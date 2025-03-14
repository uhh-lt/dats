import { Stack } from "@mui/material";
import { Link } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks.ts";
import { SourceDocumentRead } from "../../api/openapi/models/SourceDocumentRead.ts";
import { docTypeToIcon } from "../../utils/icons/docTypeToIcon.tsx";

export interface SdocRendererSharedProps {
  link?: boolean;
  renderFilename?: boolean;
  renderDoctypeIcon?: boolean;
}

interface SdocRendererProps extends SdocRendererSharedProps {
  sdoc: number | SourceDocumentRead;
}

function SdocRenderer({ sdoc, ...props }: SdocRendererProps) {
  if (typeof sdoc === "number") {
    return <SdocRendererWithoutData sdocId={sdoc} {...props} />;
  } else {
    return <SdocRendererWithData sdoc={sdoc} {...props} />;
  }
}

function SdocRendererWithoutData({ sdocId, ...props }: { sdocId: number } & SdocRendererSharedProps) {
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
}: { sdoc: SourceDocumentRead } & SdocRendererSharedProps) {
  const content = (
    <Stack direction="row" alignItems="center">
      {renderDoctypeIcon && docTypeToIcon[sdoc.doctype]}
      {renderFilename && (sdoc.name ? sdoc.name : sdoc.filename)}
    </Stack>
  );

  if (link) {
    return <Link to={`/project/${sdoc.project_id}/annotation/${sdoc.id}`}>{content}</Link>;
  }
  return content;
}

export default SdocRenderer;
