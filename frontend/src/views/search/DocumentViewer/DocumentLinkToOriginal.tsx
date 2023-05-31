import { Link, Typography, TypographyProps } from "@mui/material";
import SdocHooks from "../../../api/SdocHooks";

interface DocumentLinkToOriginalProps {
  sdocId: number;
  title: string;
}

function DocumentLinkToOriginal({ sdocId, title, ...props }: DocumentLinkToOriginalProps & TypographyProps) {
  const url = SdocHooks.useGetURL(sdocId);

  return (
    <Typography {...props}>
      {url.isSuccess ? (
        <Link href={url.data} underline="hover" color="inherit" target={"_blank"}>
          {title}
        </Link>
      ) : url.isError ? (
        <>{url.error.message}</>
      ) : (
        <>Loading...</>
      )}
    </Typography>
  );
}

export default DocumentLinkToOriginal;
