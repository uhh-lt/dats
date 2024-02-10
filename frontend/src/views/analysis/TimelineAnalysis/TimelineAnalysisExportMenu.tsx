import ImageIcon from "@mui/icons-material/Image";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { useMemo, useState } from "react";
import { TimelineAnalysisCount } from "./useTimelineAnalysis";
import CsvDownloader from "react-csv-downloader";
import { Datas } from "react-csv-downloader/dist/esm/lib/csv";

interface TimelineAnalysisExportMenuProps {
  chartName: string;
  chartData: TimelineAnalysisCount[] | undefined;
}

function TimelineAnalysisExportMenu({ chartData, chartName }: TimelineAnalysisExportMenuProps) {
  // local client state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const columns = useMemo(() => {
    if (chartData === undefined) return [];
    let keys = Object.keys(chartData[0]);
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
    let chartContainers = document.getElementsByClassName("timeline-chart");
    if (chartContainers.length === 0) return;

    let chartSVG = chartContainers[0].children[0];

    const width = chartSVG.clientWidth;
    const height = chartSVG.clientHeight;
    let svgURL = new XMLSerializer().serializeToString(chartSVG);
    let svgBlob = new Blob([svgURL], { type: "image/svg+xml;charset=utf-8" });
    let URL = window.URL || window.webkitURL || window;
    let blobURL = URL.createObjectURL(svgBlob);

    let image = new Image();
    image.onload = () => {
      let canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      let context = canvas.getContext("2d");
      if (context) {
        // Set background to white
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, context.canvas.width, context.canvas.height);
        let png = canvas.toDataURL("image/png", 1.0);

        const a = document.createElement("a");
        a.setAttribute("download", "timeline-analysis.png");
        a.setAttribute("href", png);
        a.click();
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
