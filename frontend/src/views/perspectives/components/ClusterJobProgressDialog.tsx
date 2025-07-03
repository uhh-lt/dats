import { Dialog } from "@mui/material";
import { memo } from "react";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import PerspectivesHooks from "../../../api/PerspectivesHooks.ts";
import ClusterJobProgressCard from "./ClusterJobProgressCard.tsx";

interface ClusterJobProgressDialog {
  aspectId: number;
}

function ClusterJobProgressDialog({ aspectId }: ClusterJobProgressDialog) {
  const aspect = PerspectivesHooks.useGetAspect(aspectId);
  const job = PerspectivesHooks.usePollTMJob(aspect.data?.most_recent_job_id, undefined);

  if (!job.data) {
    return null;
  }
  return (
    <Dialog
      open={job.data.status !== BackgroundJobStatus.FINISHED}
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
      <ClusterJobProgressCard tmJob={job.data} />
    </Dialog>
  );
}

export default memo(ClusterJobProgressDialog);
