import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
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
          {getIconComponent(Icon.EXPORT)}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default ExporterButton;
