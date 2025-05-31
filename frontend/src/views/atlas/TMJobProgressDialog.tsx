import { Dialog } from "@mui/material";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { TMJobRead } from "../../api/openapi/models/TMJobRead.ts";
import TMJobProgressCard from "./TMJobProgressCard.tsx";

interface TMJobProgressDialog {
  job: TMJobRead | undefined;
}

function TMJobProgressDialog({ job }: TMJobProgressDialog) {
  if (!job) {
    return null;
  }
  return (
    <Dialog open={job !== undefined && job.status !== BackgroundJobStatus.FINISHED}>
      <TMJobProgressCard tmJob={job} />
    </Dialog>
  );
}

export default TMJobProgressDialog;
