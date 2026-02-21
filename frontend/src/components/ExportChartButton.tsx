import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { exportChart } from "../utils/ExportUtils.ts";
import { Icon, getIconComponent } from "../utils/icons/iconUtils.tsx";

interface ExportChartButtonProps {
  chartName: string;
  chartIdentifier: string;
}

export function ExportChartButton({
  chartName,
  chartIdentifier,
  ...props
}: ExportChartButtonProps & Omit<IconButtonProps, "onClick">) {
  return (
    <Tooltip title={"Export chart/plot"}>
      <span>
        <IconButton onClick={() => exportChart(chartIdentifier, chartName)} {...props}>
          {getIconComponent(Icon.EXPORT)}
        </IconButton>
      </span>
    </Tooltip>
  );
}
