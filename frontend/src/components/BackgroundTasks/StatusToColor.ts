import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { JobStatus } from "../../api/openapi/models/JobStatus.ts";

export const statusToColor: Record<BackgroundJobStatus, "default" | "primary" | "success" | "error" | "warning"> = {
  [BackgroundJobStatus.WAITING]: "default",
  [BackgroundJobStatus.RUNNING]: "primary",
  [BackgroundJobStatus.FINISHED]: "success",
  [BackgroundJobStatus.ERRORNEOUS]: "error",
  [BackgroundJobStatus.ABORTED]: "error",
};

export const jobStatusToColor: Record<JobStatus, "default" | "primary" | "success" | "error" | "warning"> = {
  // waiting
  [JobStatus.QUEUED]: "default",
  [JobStatus.DEFERRED]: "default",
  [JobStatus.SCHEDULED]: "default",
  // running
  [JobStatus.STARTED]: "primary",
  // finished
  [JobStatus.FINISHED]: "success",
  // errors
  [JobStatus.FAILED]: "error",
  // aborted
  [JobStatus.STOPPED]: "error",
  [JobStatus.CANCELED]: "error",
};
