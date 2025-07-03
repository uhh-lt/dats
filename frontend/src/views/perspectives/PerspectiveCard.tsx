import ConstructionIcon from "@mui/icons-material/Construction";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import WarningIcon from "@mui/icons-material/Warning";
import { Box, Card, CardActionArea, CardContent, CardMedia, IconButton, Stack, Typography } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { AspectRead } from "../../api/openapi/models/AspectRead.ts";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import PerspectivesHooks from "../../api/PerspectivesHooks.ts";
import BackgroundJobStatusBadge from "../../components/BackgroundTasks/BackgroundJobStatusBadge.tsx";
import ConfirmationAPI from "../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";

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

interface PerspectiveCardProps {
  aspect: AspectRead;
  title: string;
  to: string;
}

function PerspectiveCard({ aspect, to, title }: PerspectiveCardProps) {
  const perspectivesJob = PerspectivesHooks.usePollPerspectivesJob(aspect.most_recent_job_id, undefined);

  const { mutate: deleteMutation, isPending } = PerspectivesHooks.useDeleteAspect();
  const handleDelete: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    ConfirmationAPI.openConfirmationDialog({
      text: `Are you sure you want to delete the map "${title}"? This action cannot be undone.`,
      onAccept: () => {
        deleteMutation({ aspectId: aspect.id });
      },
    });
  };

  if (!perspectivesJob.data) return null;
  return (
    <Card sx={{ flexShrink: 0, position: "relative", "&:hover .delete-button": { opacity: 1 } }}>
      <Box position={"absolute"} top={8} right={8} zIndex={1}>
        <BackgroundJobStatusBadge status={perspectivesJob.data?.status} />
      </Box>
      <CardActionArea component={Link} to={to}>
        {perspectivesJob.data.status === BackgroundJobStatus.FINISHED ? (
          <CardMedia
            sx={{ height: 360, width: 360, objectFit: "cover" }}
            component="img"
            image={`/content/projects/${aspect.project_id}/plots/aspect_${aspect.id}_map_thumbnail.png`}
            title="Perspectives Map Preview"
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
            {statusToIcon[perspectivesJob.data.status!]}
            <Typography variant="h6">{perspectivesJob.data.status}</Typography>
            <Typography variant="body1">{statusToText[perspectivesJob.data.status!]}</Typography>
          </Stack>
        )}

        <CardContent sx={{ py: 0.5, pb: "4px !important", borderTop: "1px solid", borderColor: "grey.300" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight="800" color="primary.dark">
              {title}
            </Typography>
            <IconButton
              className="delete-button"
              sx={{ opacity: 0, transition: "opacity 0.3s" }}
              onClick={handleDelete}
              disabled={isPending}
            >
              {getIconComponent(Icon.DELETE)}
            </IconButton>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default PerspectiveCard;
