import { Chip } from "@mui/material";
import { JobStatus } from "../../api/openapi/models/JobStatus.ts";
import { jobStatusToColor } from "./StatusToColor.ts";
import { jobStatusToIcon } from "./StatusToIcon.tsx";

function JobStatusBadge({ status }: { status: JobStatus | null | undefined }) {
  if (!status) {
    return <Chip label="Unknown" variant="outlined" color="default" />;
  }
  return (
    <Chip icon={jobStatusToIcon[status]} label={status.valueOf()} variant="outlined" color={jobStatusToColor[status]} />
  );
}

export default JobStatusBadge;
