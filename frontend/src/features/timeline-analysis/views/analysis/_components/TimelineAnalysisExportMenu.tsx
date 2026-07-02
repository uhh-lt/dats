import { ExportChartMenuItem } from "@components/export-chart-buttons";
import { getIconComponent, Icon } from "@components/icons";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { useMemo, useState } from "react";
import CsvDownloader from "react-csv-downloader";
import { Datas } from "react-csv-downloader/dist/esm/lib/csv";
import { TimelineAnalysisCount } from "./TimelineAnalysisCount";

interface TimelineAnalysisExportMenuProps {
  chartName: string;
  chartData?: TimelineAnalysisCount[];
}

export function TimelineAnalysisExportMenu({ chartData, chartName }: TimelineAnalysisExportMenuProps) {
  // local client state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const columns = useMemo(() => {
    if (chartData === undefined || chartData === null || chartData.length === 0) return [];
    const keys = Object.keys(chartData[0]);
    return keys.map((key) => ({ id: key, displayName: key }));
  }, [chartData]);

  // actions
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // render
  return (
    <>
      <Tooltip title={"Export timeline analysis"}>
        <span>
          <IconButton onClick={handleClick} disabled={chartData === undefined || chartData.length === 0}>
            <SaveAltIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <ExportChartMenuItem
          title="PNG"
          chartName={`timeline-analysis-${chartName}`}
          chartIdentifier="timeline-chart"
        />
        <CsvDownloader
          datas={(chartData as Datas) || []}
          columns={columns}
          filename={`timeline-analysis-${chartName}`}
          separator=";"
        >
          <MenuItem onClick={handleClose}>
            <ListItemIcon>{getIconComponent(Icon.EXPORT_CSV, { fontSize: "small" })}</ListItemIcon>
            <ListItemText>CSV</ListItemText>
          </MenuItem>
        </CsvDownloader>
      </Menu>
    </>
  );
}
