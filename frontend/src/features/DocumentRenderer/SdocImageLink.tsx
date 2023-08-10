import { Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks";

interface SdocImageLinkProps {
  projectId: number;
  filename: string;
  toPrefix: string;
}

function SdocImageLink({ projectId, filename, toPrefix }: SdocImageLinkProps) {
  const sdocId = SdocHooks.useGetDocumentIdByFilename(filename, projectId);
  const url = SdocHooks.useGetURL(sdocId.data, true);

  return (
    <>
      {sdocId.isSuccess && url.isSuccess ? (
        <div>
          <Link component={RouterLink} to={`${toPrefix}${sdocId.data}`}>
            <img
              src={url.data}
              alt="resolved"
              data-sdoc-id={sdocId.data}
              style={{ maxWidth: "640px", maxHeight: "480px" }}
            />
          </Link>
        </div>
      ) : sdocId.isSuccess && !url.isSuccess ? (
        <img alt={`Could not resolve ${filename} :(`} />
      ) : sdocId.isError ? (
        <div>Error: {sdocId.error.message}</div>
      ) : url.isError ? (
        <div>Error: {url.error.message}</div>
      ) : (
        <div>Loading img...</div>
      )}
    </>
  );
}

export default SdocImageLink;
