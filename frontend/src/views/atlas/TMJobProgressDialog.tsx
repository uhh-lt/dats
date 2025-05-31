import { Dialog } from "@mui/material";
import { memo } from "react";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import TMJobProgressCard from "./TMJobProgressCard.tsx";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";

interface TMJobProgressDialog {
  aspectId: number;
}

function TMJobProgressDialog({ aspectId }: TMJobProgressDialog) {
  const aspect = TopicModellingHooks.useGetAspect(aspectId);
  const job = TopicModellingHooks.usePollTMJob(aspect.data?.most_recent_job_id, undefined);

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
      <TMJobProgressCard tmJob={job.data} />
    </Dialog>
  );
}

export default memo(TMJobProgressDialog);
