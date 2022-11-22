import SdocHooks from "../../../api/SdocHooks";
import { Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

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
          {sdocId.data ? (
            <Link component={RouterLink} to={`${toPrefix}${sdocId.data}`}>
              <img src={url.data} />
            </Link>
          ) : (
            <img alt={`Could not resolve image ${filename} :(`} />
          )}
        </div>
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
