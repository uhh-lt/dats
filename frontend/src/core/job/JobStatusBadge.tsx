import { JobStatus } from "@api/models/JobStatus";
import { Chip } from "@mui/material";
import { jobStatusToColor } from "./JobStatusToColor";
import { jobStatusToIcon } from "./JobStatusToIcon";

export function JobStatusBadge({ status }: { status: JobStatus | null | undefined }) {
  if (!status) {
    return <Chip label="Unknown" variant="outlined" color="default" />;
  }
  return (
    <Chip icon={jobStatusToIcon[status]} label={status.valueOf()} variant="outlined" color={jobStatusToColor[status]} />
  );
}
