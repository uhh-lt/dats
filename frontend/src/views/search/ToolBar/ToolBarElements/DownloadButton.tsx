import Tooltip from "@mui/material/Tooltip";
import * as React from "react";
import { IconButton, IconButtonProps } from "@mui/material";
import SdocHooks from "../../../../api/SdocHooks";
import DownloadIcon from "@mui/icons-material/Download";
import { Link } from "react-router-dom";

interface DownloadButtonProps {
  sdocId: number;
}

function DownloadButton({ sdocId, ...props }: DownloadButtonProps & IconButtonProps) {
  const url = SdocHooks.useGetURL(sdocId);

  return (
    <Tooltip title="Download file">
      <span>
        <Link to={url.isSuccess ? url.data : "#"} target="_blank" download={url.isSuccess}>
          <IconButton>
            <DownloadIcon />
          </IconButton>
        </Link>
      </span>
    </Tooltip>
  );
}

export default DownloadButton;
