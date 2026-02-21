import BarChartIcon from "@mui/icons-material/BarChart";
import ReplayIcon from "@mui/icons-material/Replay";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Box, CardContent, CardHeader, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import { ReactNode, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as ChartTooltip,
  Dot,
  DotProps,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import { TimelineAnalysisHooks } from "../../../api/TimelineAnalysisHooks.ts";
import { CardContainer } from "../../../components/MUI/CardContainer.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { TimelineAnalysisCount } from "./TimelineAnalysisCount.ts";
import { TimelineAnalysisExportMenu } from "./TimelineAnalysisExportMenu.tsx";
import { TimelineAnalysisActions } from "./timelineAnalysisSlice.ts";

interface TimelineAnalysisVizProps {
  timelineAnalysis: TimelineAnalysisRead;
}

export function TimelineAnalysisViz({ timelineAnalysis }: TimelineAnalysisVizProps) {
  // redux
  const provenanceDate = useAppSelector((state) => state.timelineAnalysis.provenanceDate);
  const provenanceConcept = useAppSelector((state) => state.timelineAnalysis.provenanceConcept);
  const isBarPlot = useAppSelector((state) => state.timelineAnalysis.isBarPlot);
  const dispatch = useAppDispatch();

  // event handlers
  const recomputeMutation = TimelineAnalysisHooks.useRecomputeTimelineAnalysis();
  const recomputeTimelineAnalysis = () => {
    recomputeMutation.mutate({
      timelineAnalysisId: timelineAnalysis.id,
    });
  };

  const handleClick = (date: string, conceptName: string) => {
    dispatch(TimelineAnalysisActions.setProvenanceDate(date));
    dispatch(TimelineAnalysisActions.setProvenanceConcept(conceptName));
  };

  // compute chart data
  const chartData: TimelineAnalysisCount[] = useMemo(() => {
    const date2concept2counts: Record<string, Record<string, number>> = {};
    timelineAnalysis.concepts.forEach((concept) => {
      if (!concept.visible) return;
      concept.results.forEach((result) => {
        date2concept2counts[result.date] = date2concept2counts[result.date] || {};
        date2concept2counts[result.date][concept.name] = result.count;
      });
    });
    return Object.entries(date2concept2counts).map(([date, concept2counts]) => {
      return { date, ...concept2counts };
    });
  }, [timelineAnalysis]);

  // render
  let content: ReactNode;
  if (timelineAnalysis.concepts.length === 0) {
    content = (
      <Typography>Please add a concept to start the analysis (or make at least one concept visible).</Typography>
    );
  } else if (
    timelineAnalysis.settings.date_metadata_id === undefined ||
    timelineAnalysis.settings.date_metadata_id === null
  ) {
    content = (
      <Typography>
        Please specify the <i>Date metadata</i> to be used in the analysis.
      </Typography>
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
                    key={props.key}
                    isSelected={provenanceConcept === concept.name && provenanceDate === props.payload.date}
                  />
                )}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                activeDot={(props: any) => (
                  <CustomizedDot
                    {...props}
                    key={props.key}
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
    <CardContainer className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <>
            <Tooltip title="Recompute Timeline Analysis">
              <span>
                <IconButton onClick={() => recomputeTimelineAnalysis()} disabled={recomputeMutation.isPending}>
                  {recomputeMutation.isPending ? <CircularProgress size={20} /> : <ReplayIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <TimelineAnalysisExportMenu
              chartData={chartData}
              chartName={(isBarPlot ? "barchart-" : "linechart-") + timelineAnalysis.name}
            />
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
    </CardContainer>
  );
}

interface CustomizedDotProps extends DotProps {
  isSelected: boolean;
  onClick?: () => void;
}

const CustomizedDot = ({ cx, cy, r, stroke, isSelected, onClick }: CustomizedDotProps) => {
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isSelected && r ? 2 * r : r}
      stroke={isSelected ? "black" : undefined}
      strokeWidth={isSelected ? 2 : undefined}
      fill={stroke}
      onClick={onClick ? () => onClick() : undefined}
    />
  );
};
