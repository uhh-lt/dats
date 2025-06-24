import BarChartIcon from "@mui/icons-material/BarChart";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import React, { useMemo, useState } from "react";
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
import { TimelineAnalysisCount } from "../../analysis/TimelineAnalysis/TimelineAnalysisCount.ts";

interface TimelineAnalysisNodeVizProps {
  timelineAnalysis: TimelineAnalysisRead;
  height?: number;
  width?: number;
  compact?: boolean;
}

function TimelineAnalysisNodeViz({
  timelineAnalysis,
  height = 350,
  width = 550,
  compact = true,
}: TimelineAnalysisNodeVizProps) {
  // Local state for this node (independent of global redux state)
  const [isBarPlot, setIsBarPlot] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [selectedConcept, setSelectedConcept] = useState<string | undefined>();

  const handleClick = (date: string, conceptName: string) => {
    setSelectedDate(date);
    setSelectedConcept(conceptName);
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

  // render chart content
  let chartContent: React.ReactNode;
  if (timelineAnalysis.concepts.length === 0) {
    chartContent = (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%">
        <Typography variant="body2" color="textSecondary">
          No concepts available
        </Typography>
      </Box>
    );
  } else if (
    timelineAnalysis.settings.date_metadata_id === undefined ||
    timelineAnalysis.settings.date_metadata_id === null
  ) {
    chartContent = (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%">
        <Typography variant="body2" color="textSecondary">
          No date metadata configured
        </Typography>
      </Box>
    );
  } else if (chartData.length === 0) {
    chartContent = (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%">
        <Typography variant="body2" color="textSecondary">
          No data available
        </Typography>
      </Box>
    );
  } else {
    if (isBarPlot) {
      chartContent = (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} className="timeline-chart">
            <XAxis dataKey="date" fontSize={compact ? 10 : 12} tick={{ fontSize: compact ? 10 : 12 }} />
            <YAxis fontSize={compact ? 10 : 12} tick={{ fontSize: compact ? 10 : 12 }} />
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
                    stroke={selectedConcept === concept.name && entry.date === selectedDate ? "black" : undefined}
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
      chartContent = (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} className="timeline-chart">
            <XAxis dataKey="date" fontSize={compact ? 10 : 12} tick={{ fontSize: compact ? 10 : 12 }} />
            <YAxis fontSize={compact ? 10 : 12} tick={{ fontSize: compact ? 10 : 12 }} />
            <CartesianGrid stroke="#eee" />
            <ChartTooltip />
            {timelineAnalysis.concepts.map((concept) => (
              <Line
                key={concept.name}
                dataKey={concept.name}
                stroke={concept.color}
                strokeWidth={compact ? 1.5 : 2}
                dot={(props) => (
                  <CustomizedDot
                    {...props}
                    key={props.key}
                    isSelected={selectedConcept === concept.name && selectedDate === props.payload.date}
                    size={compact ? 3 : 4}
                  />
                )}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                activeDot={(props: any) => (
                  <CustomizedDot
                    {...props}
                    key={props.key}
                    r={compact ? 4 : 5}
                    stroke={concept.color}
                    isSelected={selectedConcept === concept.name && selectedDate === props.payload.date}
                    onClick={() => handleClick(props.payload.date, concept.name)}
                    size={compact ? 4 : 5}
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
    <Box sx={{ width: width, height: height, position: "relative" }}>
      {/* Chart Type Toggle - positioned in top right */}
      <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
        <Tooltip title={isBarPlot ? "View as Line Chart" : "View as Bar Chart"}>
          <IconButton
            size="small"
            onClick={() => setIsBarPlot(!isBarPlot)}
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.9)" },
            }}
          >
            {isBarPlot ? <TimelineIcon fontSize="small" /> : <BarChartIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Chart Content */}
      <Box sx={{ width: "100%", height: "100%", pt: compact ? 0.5 : 1 }}>{chartContent}</Box>

      {/* Selected Info - positioned in bottom left */}
      {selectedDate && selectedConcept && (
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: 8,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: compact ? 10 : 12,
          }}
        >
          <Typography variant="caption">
            {selectedConcept} in {selectedDate}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

interface CustomizedDotProps extends DotProps {
  isSelected: boolean;
  onClick?: () => void;
  size?: number;
}

const CustomizedDot = ({ cx, cy, r, stroke, isSelected, onClick, size = 4 }: CustomizedDotProps) => {
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isSelected && r ? 2 * r : r || size}
      stroke={isSelected ? "black" : undefined}
      strokeWidth={isSelected ? 2 : undefined}
      fill={stroke}
      onClick={onClick ? () => onClick() : undefined}
    />
  );
};

export default TimelineAnalysisNodeViz;
