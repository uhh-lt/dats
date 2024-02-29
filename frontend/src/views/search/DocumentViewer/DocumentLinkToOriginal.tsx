import { Link } from "@mui/material";
import SdocHooks from "../../../api/SdocHooks.ts";

interface DocumentLinkToOriginalProps {
  sdocId: number | undefined;
  children?: React.ReactNode;
}

function DocumentLinkToOriginal({ sdocId, children }: DocumentLinkToOriginalProps) {
  const url = SdocHooks.useGetURL(sdocId);

  return (
    <>
      {url.isSuccess ? (
        <Link href={url.data} underline="hover" color="inherit" target={"_blank"}>
          {children}
        </Link>
      ) : (
        <>{children}</>
      )}
    </>
  );
}

export default DocumentLinkToOriginal;
