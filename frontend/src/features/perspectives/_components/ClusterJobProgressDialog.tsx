import { JobStatus } from "@models/JobStatus";
import { Dialog } from "@mui/material";
import { memo } from "react";
import { useGetAspect, useLivePerspectivesJob } from "../api/perspectivesHooks";
import { ClusterJobProgressCard } from "./ClusterJobProgressCard";

interface ClusterJobProgressDialog {
  aspectId: number;
}

export const ClusterJobProgressDialog = memo(({ aspectId }: ClusterJobProgressDialog) => {
  const aspect = useGetAspect(aspectId);
  const job = useLivePerspectivesJob(aspect.data?.most_recent_job_id, undefined);

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
});
