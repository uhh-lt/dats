import BarChartIcon from "@mui/icons-material/BarChart";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Box, Card, CardContent, CardHeader, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as ChartTooltip,
  Dot,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { TimelineAnalysisRead } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { TimelineAnalysisActions } from "./timelineAnalysisSlice";
import { TimelineAnalysisCount } from "./useTimelineAnalysis";

interface TimelineAnalysisVizProps {
  chartData: TimelineAnalysisCount[] | undefined;
  timelineAnalysis: TimelineAnalysisRead;
}

function TimelineAnalysisViz({ chartData, timelineAnalysis }: TimelineAnalysisVizProps) {
  // redux
  const provenanceDate = useAppSelector((state) => state.timelineAnalysis.provenanceDate);
  const provenanceConcept = useAppSelector((state) => state.timelineAnalysis.provenanceConcept);
  const isBarPlot = useAppSelector((state) => state.timelineAnalysis.isBarPlot);
  const dispatch = useAppDispatch();

  // event handlers
  const handleClick = (date: string, conceptName: string) => {
    dispatch(TimelineAnalysisActions.setProvenanceDate(date));
    dispatch(TimelineAnalysisActions.setProvenanceConcept(conceptName));
  };
  const handleExportChart = () => {
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
      console.log("JOJO");
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
  };

  // render
  let content: React.ReactNode;
  if (timelineAnalysis.concepts.length === 0) {
    content = (
      <Typography>Please add a concept to start the analysis (or make at least one concept visible).</Typography>
    );
  } else if (!chartData) {
    content = (
      <Box height="100%" alignItems="center" justifyContent="center" display="flex">
        <CircularProgress size={80} />
      </Box>
    );
  } else if (chartData.length === 0) {
    content = <Typography>No data available for the given the settings and concepts.</Typography>;
  } else {
    if (isBarPlot) {
      content = (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} className="timeline-chart">
            <XAxis dataKey={"date"} />
            <YAxis />
            <CartesianGrid stroke="#eee" />
            <ChartTooltip />
            {timelineAnalysis.concepts.map((concept) => (
              <Bar
                key={concept.name}
                dataKey={concept.name}
                fill={concept.color}
                onClick={(data) => handleClick(data.date, concept.name)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    stroke={provenanceConcept === concept.name && entry.date === provenanceDate ? "black" : undefined}
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    } else {
      content = (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} className="timeline-chart">
            <XAxis dataKey={"date"} />
            <YAxis />
            <CartesianGrid stroke="#eee" />
            <ChartTooltip />
            {timelineAnalysis.concepts.map((concept) => (
              <Line
                key={concept.name}
                dataKey={concept.name}
                stroke={concept.color}
                dot={(props) => (
                  <CustomizedDot
                    {...props}
                    isSelected={provenanceConcept === concept.name && provenanceDate === props.payload.date}
                  />
                )}
                activeDot={(props) => (
                  <CustomizedDot
                    {...props}
                    r={5}
                    stroke={concept.color}
                    isSelected={provenanceConcept === concept.name && provenanceDate === props.payload.date}
                    onClick={() => handleClick(props.payload.date, concept.name)}
                  />
                )}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }
  }

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <>
            <Tooltip title={"Export chart"}>
              <IconButton onClick={handleExportChart}>
                <SaveAltIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={isBarPlot ? "View as Line Chart" : "View as Bar Chart"}>
              <IconButton onClick={() => dispatch(TimelineAnalysisActions.onTogglePlotType())}>
                {isBarPlot ? <TimelineIcon /> : <BarChartIcon />}
              </IconButton>
            </Tooltip>
          </>
        }
        title={"Timeline Analysis"}
        subheader={`Click on a ${isBarPlot ? "bar" : "dot"} to see more information.`}
      />
      <CardContent className="myFlexFillAllContainer">{content}</CardContent>
    </Card>
  );
}

export default TimelineAnalysisViz;

const CustomizedDot = (props: any) => {
  const { cx, cy, stroke, r, isSelected, onClick } = props;

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isSelected ? 2 * r : r}
      stroke={isSelected ? "black" : undefined}
      strokeWidth={isSelected ? 2 : undefined}
      fill={stroke}
      onClick={onClick ? () => onClick() : undefined}
    />
  );
};
