import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
} from "@mui/lab";
import { Box, Paper, Typography } from "@mui/material";
import { useState } from "react";

export interface Event {
  time: string;
  description: string;
}

export interface TimelineData {
  events: Event[];
}

const DEFAULT_INITIAL_DATA = () => {
  return {
    events: [
      {
        time: "Time",
        description: "Description",
      },
    ],
  };
};

interface EventTimelineProps {
  readOnly: boolean;
  data: TimelineData;
  onDataChange: (data: any) => void;
}

function EventTimeline({ readOnly, data, onDataChange }: EventTimelineProps) {
  const [timelineData, setTimelineData] = useState(data.events.length > 0 ? data : DEFAULT_INITIAL_DATA);

  const updateTimelineData = (newData: TimelineData) => {
    setTimelineData(newData);
    // Inform editorjs about data change
    onDataChange(newData);
  };

  const onAddEvent = () => {
    const newData = {
      ...timelineData,
    };
    newData.events.push({
      time: "Time",
      description: "Description",
    });
    updateTimelineData(newData);
  };

  const onContentChange = (index: number, fieldName: "time" | "description") => {
    return (e: React.FocusEvent<HTMLSpanElement, Element>) => {
      const newData = {
        ...timelineData,
      };
      newData.events[index][fieldName] = e.currentTarget.textContent || "";
      updateTimelineData(newData);
    };
  };

  return (
    <Box>
      <Timeline>
        {timelineData.events.map((event, index) => (
          <TimelineItem key={index}>
            <TimelineOppositeContent>
              <Typography
                color="textSecondary"
                onBlur={(e) => onContentChange(index, "time")}
                suppressContentEditableWarning={!readOnly}
                contentEditable={!readOnly}
              >
                {event.time}
              </Typography>
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot />
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent>
              <Paper elevation={3}>
                <Typography
                  color="primary"
                  onBlur={onContentChange(index, "description")}
                  suppressContentEditableWarning={!readOnly}
                  contentEditable={!readOnly}
                >
                  {event.description}
                </Typography>
              </Paper>
            </TimelineContent>
          </TimelineItem>
        ))}
        {!readOnly && (
          <TimelineItem>
            <TimelineOppositeContent />
            <TimelineSeparator>
              <TimelineDot color="primary" onClick={onAddEvent}>
                <Typography> + </Typography>
              </TimelineDot>
            </TimelineSeparator>
            <TimelineContent />
          </TimelineItem>
        )}
      </Timeline>
    </Box>
  );
}

export default EventTimeline;
