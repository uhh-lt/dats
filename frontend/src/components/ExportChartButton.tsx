import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { exportChart } from "../utils/ExportUtils.ts";

interface ExportChartButtonProps {
  chartName: string;
  chartIdentifier: string;
}

function ExportChartButton({
  chartName,
  chartIdentifier,
  ...props
}: ExportChartButtonProps & Omit<IconButtonProps, "onClick">) {
  // render
  return (
    <Tooltip title={"Export chart/plot"}>
      <span>
        <IconButton onClick={() => exportChart(chartIdentifier, chartName)} {...props}>
          <SaveAltIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default ExportChartButton;
