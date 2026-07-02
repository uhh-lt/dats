import { JobStatus } from "@api/models/JobStatus";
import { Icon } from "./DATSIcons";

export const JobStatusIcons: Record<JobStatus, Icon> = {
  // waiting
  [JobStatus.QUEUED]: Icon.JOB_WAITING,
  [JobStatus.DEFERRED]: Icon.JOB_WAITING,
  [JobStatus.SCHEDULED]: Icon.JOB_WAITING,
  // running
  [JobStatus.STARTED]: Icon.JOB_RUNNING,
  // done
  [JobStatus.FINISHED]: Icon.JOB_DONE,
  // errors
  [JobStatus.FAILED]: Icon.JOB_ERROR,
  // aborted
  [JobStatus.STOPPED]: Icon.JOB_ABORTED,
  [JobStatus.CANCELED]: Icon.JOB_ABORTED,
};
