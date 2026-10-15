import { useLiveJob } from "@core/job";
import { JobStatus } from "@models/JobStatus";
import { Dialog } from "@mui/material";
import { memo } from "react";
import { PerspectivesHooks } from "../api/perspectiveHooks";
import { perspectiveQueries } from "../api/perspectiveQueries";
import { ClusterJobProgressCard } from "./ClusterJobProgressCard";

interface ClusterJobProgressDialog {
  aspectId: number;
}

export const ClusterJobProgressDialog = memo(({ aspectId }: ClusterJobProgressDialog) => {
  const aspect = PerspectivesHooks.useGetAspect(aspectId);
  const job = useLiveJob(perspectiveQueries.job.byId(aspect.data?.most_recent_job_id));

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
