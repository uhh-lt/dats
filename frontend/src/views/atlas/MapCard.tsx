import ConstructionIcon from "@mui/icons-material/Construction";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import WarningIcon from "@mui/icons-material/Warning";
import { Box, Card, CardActionArea, CardContent, CardMedia, Stack, Typography } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { AspectRead } from "../../api/openapi/models/AspectRead.ts";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import BackgroundJobStatusBadge from "./BackgroundJobStatusBadge.tsx";

const statusToIcon: Record<BackgroundJobStatus, React.ReactElement> = {
  [BackgroundJobStatus.WAITING]: <HourglassTopIcon style={{ fontSize: 48 }} />,
  [BackgroundJobStatus.RUNNING]: <ConstructionIcon style={{ fontSize: 48 }} />,
  [BackgroundJobStatus.FINISHED]: <TaskAltIcon style={{ fontSize: 48 }} />,
  [BackgroundJobStatus.ERRORNEOUS]: <WarningIcon style={{ fontSize: 48 }} />,
  [BackgroundJobStatus.ABORTED]: <WarningIcon style={{ fontSize: 48 }} />,
};

const statusToText: Record<BackgroundJobStatus, string> = {
  [BackgroundJobStatus.WAITING]: "Job is about to start. Please wait...",
  [BackgroundJobStatus.RUNNING]: "Map Creation in progress! Please wait...",
  [BackgroundJobStatus.FINISHED]: "Finished",
  [BackgroundJobStatus.ERRORNEOUS]: "An error occurred while creating the map.",
  [BackgroundJobStatus.ABORTED]: "An error occurred while creating the map.",
};

interface MapCardProps {
  aspect: AspectRead;
  title: string;
  to: string;
}

function MapCard({ aspect, to, title }: MapCardProps) {
  const tmJob = TopicModellingHooks.usePollTMJob(aspect.most_recent_job_id, undefined);

  if (!tmJob.data) return null;
  return (
    <Card sx={{ flexShrink: 0, position: "relative" }}>
      <Box position={"absolute"} top={8} right={8} zIndex={1}>
        <BackgroundJobStatusBadge status={tmJob.data?.status} />
      </Box>
      <CardActionArea component={Link} to={to}>
        {tmJob.data.status === BackgroundJobStatus.FINISHED ? (
          <CardMedia
            sx={{ height: 360, width: 360, objectFit: "cover" }}
            component="img"
            image={`/content/projects/${aspect.project_id}/plots/aspect_${aspect.id}_map_thumbnail.png`}
            title="Atlas Map Preview"
          />
        ) : (
          <Stack
            sx={{
              height: 360,
              width: 360,
              alignItems: "center",
              justifyContent: "center",
              color: "text.secondary",
              textAlign: "center",
            }}
          >
            {statusToIcon[tmJob.data.status!]}
            <Typography variant="h6">{tmJob.data.status}</Typography>
            <Typography variant="body1">{statusToText[tmJob.data.status!]}</Typography>
          </Stack>
        )}

        <CardContent sx={{ py: 0.5, pb: "4px !important", borderTop: "1px solid", borderColor: "grey.300" }}>
          <Typography variant="subtitle1" fontWeight="800" color="primary.dark">
            {title}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default MapCard;
