import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useCallback } from "react";
import ExporterAPI from "./ExporterAPI.ts";
import { ExporterInfo } from "./ExporterDialog.tsx";

interface ExporterButtonProps {
  tooltip: string;
  exporterInfo: ExporterInfo;
  iconButtonProps?: IconButtonProps;
}

function ExporterButton({ tooltip, exporterInfo: exporterConfig, iconButtonProps }: ExporterButtonProps) {
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
