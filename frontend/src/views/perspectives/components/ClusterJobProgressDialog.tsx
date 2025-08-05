import { Dialog } from "@mui/material";
import { memo } from "react";
import { JobStatus } from "../../../api/openapi/models/JobStatus.ts";
import PerspectivesHooks from "../../../api/PerspectivesHooks.ts";
import ClusterJobProgressCard from "./ClusterJobProgressCard.tsx";

interface ClusterJobProgressDialog {
  aspectId: number;
}

function ClusterJobProgressDialog({ aspectId }: ClusterJobProgressDialog) {
  const aspect = PerspectivesHooks.useGetAspect(aspectId);
  const job = PerspectivesHooks.usePollPerspectivesJob(aspect.data?.most_recent_job_id, undefined);

  if (!job.data) {
    return null;
  }
  return (
    <Dialog
      open={job.data.status !== JobStatus.FINISHED}
      maxWidth="lg"
      fullWidth
      slotProps={{
        root: {
          sx: {
            top: "49px",
            left: "49px",
          },
        },
        backdrop: {
          sx: {
            top: "49px",
            left: "49px",
          },
        },
      }}
    >
      <ClusterJobProgressCard perspectivesJob={job.data} />
    </Dialog>
  );
}

export default memo(ClusterJobProgressDialog);
