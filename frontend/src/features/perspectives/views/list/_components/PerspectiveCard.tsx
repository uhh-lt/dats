import { PerspectivesQueryOptions } from "../../../_api/perspectivesQueryOptions";
import { AspectRead } from "@api/models/AspectRead";
import { JobStatus } from "@api/models/JobStatus";
import { JobStatusBadge } from "@core/job";
import { useOpenConfirmationDialog } from "@core/notification";
import ConstructionIcon from "@mui/icons-material/Construction";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import WarningIcon from "@mui/icons-material/Warning";
import { Box, Card, CardActionArea, CardContent, CardMedia, IconButton, Stack, Typography } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { getIconComponent, Icon } from "@utils/icons/iconUtils";
import { ReactElement } from "react";

const statusToIcon: Record<JobStatus, ReactElement> = {
  // waiting
  [JobStatus.QUEUED]: <HourglassTopIcon style={{ fontSize: 48 }} />,
  [JobStatus.DEFERRED]: <HourglassTopIcon style={{ fontSize: 48 }} />,
  [JobStatus.SCHEDULED]: <HourglassTopIcon style={{ fontSize: 48 }} />,
  // running
  [JobStatus.STARTED]: <ConstructionIcon style={{ fontSize: 48 }} />,
  // finished
  [JobStatus.FINISHED]: <TaskAltIcon style={{ fontSize: 48 }} />,
  // errors
  [JobStatus.FAILED]: <WarningIcon style={{ fontSize: 48 }} />,
  // aborted
  [JobStatus.STOPPED]: <WarningIcon style={{ fontSize: 48 }} />,
  [JobStatus.CANCELED]: <WarningIcon style={{ fontSize: 48 }} />,
};

const statusToText: Record<JobStatus, string> = {
  // waiting
  [JobStatus.QUEUED]: "Job is about to start. Please wait...",
  [JobStatus.DEFERRED]: "Job is about to start. Please wait...",
  [JobStatus.SCHEDULED]: "Job is about to start. Please wait...",
  // running
  [JobStatus.STARTED]: "Map Creation in progress! Please wait...",
  // finished
  [JobStatus.FINISHED]: "Finished",
  // errors
  [JobStatus.FAILED]: "An error occurred while creating the map.",
  // aborted
  [JobStatus.STOPPED]: "The map creation was stopped.",
  [JobStatus.CANCELED]: "The map creation was canceled.",
};

interface PerspectiveCardProps {
  aspect: AspectRead;
  title: string;
  to: string;
}

export function PerspectiveCard({ aspect, to, title }: PerspectiveCardProps) {
  const perspectivesJob = PerspectivesQueryOptions.usePollPerspectivesJob(aspect.most_recent_job_id, undefined);
  const openConfirmationDialog = useOpenConfirmationDialog();
  const { mutate: deleteMutation, isPending } = PerspectivesQueryOptions.useDeleteAspect();
  const handleDelete: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    openConfirmationDialog({
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
        <JobStatusBadge status={perspectivesJob.data?.status} />
      </Box>
      <CardActionArea component={Link} to={to}>
        {perspectivesJob.data.status === JobStatus.FINISHED ? (
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
