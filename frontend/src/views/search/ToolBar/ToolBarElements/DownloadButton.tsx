import DownloadIcon from "@mui/icons-material/Download";
import { IconButton, IconButtonProps } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { Link } from "react-router-dom";
import SdocHooks from "../../../../api/SdocHooks.ts";

interface DownloadButtonProps {
  sdocId: number;
}

function DownloadButton({ sdocId, ...props }: DownloadButtonProps & IconButtonProps) {
  const url = SdocHooks.useGetURL(sdocId);

  return (
    <Tooltip title="Download file">
      <span>
        <Link to={url.isSuccess ? url.data : "#"} target="_blank" download={url.isSuccess}>
          <IconButton {...props}>
            <DownloadIcon />
          </IconButton>
        </Link>
      </span>
    </Tooltip>
  );
}

export default DownloadButton;
