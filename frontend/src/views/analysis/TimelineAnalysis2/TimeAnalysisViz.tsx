import InfoIcon from "@mui/icons-material/Info";
import { Box, Card, CardContent, CardHeader, CircularProgress, IconButton, Typography } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import React from "react";
import { TimelineAnalysisCount } from "./useTimelineAnalysis";
import { TimelineAnalysisActions, TimelineAnalysisConcept } from "./timelineAnalysisSlice";

interface TimelineAnalysisVizProps {
  chartData: TimelineAnalysisCount[] | undefined;
  concepts: TimelineAnalysisConcept[];
}

function TimelineAnalysisViz({ chartData, concepts }: TimelineAnalysisVizProps) {
  // redux
  const provenanceDate = useAppSelector((state) => state.timelineAnalysis.provenanceDate);
  const provenanceConcept = useAppSelector((state) => state.timelineAnalysis.provenanceConcept);
  const dispatch = useAppDispatch();

  // event handlers
  const handleClick = (data: any, concept: TimelineAnalysisConcept) => {
    dispatch(TimelineAnalysisActions.setProvenanceDate(data.date));
    dispatch(TimelineAnalysisActions.setProvenanceConcept(concept.name));
  };

  // rendert
  let content: React.ReactNode;
  if (concepts.length === 0) {
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
    content = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis dataKey={"date"} />
          <YAxis />
          <CartesianGrid stroke="#eee" />
          <ChartTooltip />
          {concepts.map((concept) => (
            <Bar
              key={concept.name}
              dataKey={concept.name}
              fill={concept.color}
              onClick={(data) => handleClick(data, concept)}
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
  }

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title={"Timeline Analysis"}
        subheader="Analysis over time."
      />
      <CardContent className="myFlexFillAllContainer">{content}</CardContent>
    </Card>
  );
}

export default TimelineAnalysisViz;
