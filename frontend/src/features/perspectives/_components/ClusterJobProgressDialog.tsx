import { PerspectivesQueryOptions } from "../../_api/perspectivesQueryOptions";
import { JobStatus } from "@api/models/JobStatus";
import { Dialog } from "@mui/material";
import { memo } from "react";
import { ClusterJobProgressCard } from "./ClusterJobProgressCard";

interface ClusterJobProgressDialog {
  aspectId: number;
}

export const ClusterJobProgressDialog = memo(({ aspectId }: ClusterJobProgressDialog) => {
  const aspect = PerspectivesQueryOptions.useGetAspect(aspectId);
  const job = PerspectivesQueryOptions.usePollPerspectivesJob(aspect.data?.most_recent_job_id, undefined);

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
