import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useCallback } from "react";
import ExporterAPI, { ExporterConfig } from "./ExporterAPI";

interface ExporterButtonProps {
  tooltip: string;
  exporterConfig: ExporterConfig;
  iconButtonProps?: IconButtonProps;
}

function ExporterButton({ tooltip, exporterConfig, iconButtonProps }: ExporterButtonProps) {
  const handleClick = useCallback(() => {
    ExporterAPI.openExporterDialog(exporterConfig);
  }, [exporterConfig]);

  return (
    <Tooltip title={tooltip}>
      <span>
        <IconButton onClick={handleClick} {...iconButtonProps}>
          <SaveAltIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default ExporterButton;
