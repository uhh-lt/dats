import { getIconComponent, JobStatusIcons } from "@components/icons";
import { JobStatus } from "@models/JobStatus";
import { Chip } from "@mui/material";
import { jobStatusToColor } from "./JobStatusToColor";

export function JobStatusBadge({ status }: { status: JobStatus | null | undefined }) {
  if (!status) {
    return <Chip label="Unknown" variant="outlined" color="default" />;
  }
  return (
    <Chip
      icon={getIconComponent(JobStatusIcons[status])}
      label={status.valueOf()}
      variant="outlined"
      color={jobStatusToColor[status]}
    />
  );
}
