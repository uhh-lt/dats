import { Chip } from "@mui/material";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { statusToColor } from "../../components/BackgroundTasks/StatusToColor.ts";
import { statusToIcon } from "../../components/BackgroundTasks/StatusToIcon.tsx";

function BackgroundJobStatusBadge({ status }: { status: BackgroundJobStatus | null | undefined }) {
  if (!status) {
    return <Chip label="Unknown" variant="outlined" color="default" />;
  }
  return <Chip icon={statusToIcon[status]} label={status.valueOf()} variant="outlined" color={statusToColor[status]} />;
}

export default BackgroundJobStatusBadge;
