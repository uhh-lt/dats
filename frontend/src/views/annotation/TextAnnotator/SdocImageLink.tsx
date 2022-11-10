import SdocHooks from "../../../api/SdocHooks";
import { Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

interface SdocImageLinkProps {
  sdocId: number;
  to: string;
}

function SdocImageLink({ to, sdocId }: SdocImageLinkProps) {
  const url = SdocHooks.useGetURL(sdocId);

  return (
    <>
      {url.isSuccess ? (
        <div>
          <Link component={RouterLink} to={to}>
            <img src={url.data} />
          </Link>
        </div>
      ) : url.isError ? (
        <div>Error: {url.error.message}</div>
      ) : (
        <div>Loading img...</div>
      )}
    </>
  );
}

export default SdocImageLink;
