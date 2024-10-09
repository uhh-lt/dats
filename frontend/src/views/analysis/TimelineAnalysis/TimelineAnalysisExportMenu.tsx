import ImageIcon from "@mui/icons-material/Image";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { useMemo, useState } from "react";
import CsvDownloader from "react-csv-downloader";
import { Datas } from "react-csv-downloader/dist/esm/lib/csv";
import { downloadFile } from "../../../utils/fileDownload.ts";
import { TimelineAnalysisCount } from "./useTimelineAnalysis.ts";

interface TimelineAnalysisExportMenuProps {
  chartName: string;
  chartData?: TimelineAnalysisCount[];
}

function TimelineAnalysisExportMenu({ chartData, chartName }: TimelineAnalysisExportMenuProps) {
  // local client state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const columns = useMemo(() => {
    if (chartData === undefined || chartData === null || chartData.length === 0) return [];
    console.log("chartData", chartData);
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
  const handleExportChartPNG = () => {
    const chartContainers = document.getElementsByClassName("timeline-chart");
    if (chartContainers.length === 0) return;

    const chartSVG = chartContainers[0].children[0];

    const width = chartSVG.clientWidth;
    const height = chartSVG.clientHeight;
    const svgURL = new XMLSerializer().serializeToString(chartSVG);
    const svgBlob = new Blob([svgURL], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (context) {
        // Set background to white
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, context.canvas.width, context.canvas.height);
        const png = canvas.toDataURL("image/png", 1.0);

        downloadFile(png, "timeline-analysis.png");
      }
    };

    image.src = blobURL;
    setAnchorEl(null);
  };

  // render
  return (
    <>
      <Tooltip title={"Export chart"}>
        <IconButton onClick={handleClick}>
          <SaveAltIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleExportChartPNG}>
          <ListItemIcon>
            <ImageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>PNG</ListItemText>
        </MenuItem>
        <CsvDownloader datas={(chartData as Datas) || []} columns={columns} filename={chartName} separator=";">
          <MenuItem disabled={chartData === undefined} onClick={handleClose}>
            <ListItemIcon>
              <TextSnippetIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>CSV</ListItemText>
          </MenuItem>
        </CsvDownloader>
      </Menu>
    </>
  );
}

export default TimelineAnalysisExportMenu;
