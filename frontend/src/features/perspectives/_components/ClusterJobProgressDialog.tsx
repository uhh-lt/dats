/* eslint-disable local/dialog-conventions -- a blocking progress overlay without header, it closes itself when the job finishes */
import { useLiveJob } from "@core/job";
import { JobStatus } from "@models/JobStatus";
import { Dialog } from "@mui/material";
import { PerspectivesHooks } from "../api/perspectivesHooks";
import { perspectivesQueries } from "../api/perspectivesQueries";
import { ClusterJobProgressCard } from "./ClusterJobProgressCard";

interface ClusterJobProgressDialogProps {
  aspectId: number;
}

export function ClusterJobProgressDialog({ aspectId }: ClusterJobProgressDialogProps) {
  const aspect = PerspectivesHooks.useGetAspect(aspectId);
  const job = useLiveJob(perspectivesQueries.job.byId(aspect.data?.most_recent_job_id));

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
