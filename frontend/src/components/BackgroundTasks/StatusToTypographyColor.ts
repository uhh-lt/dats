import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { JobStatus } from "../../api/openapi/models/JobStatus.ts";

export const statusToTypographyColor: Record<
  BackgroundJobStatus,
  "secondary.main" | "primary.main" | "success.main" | "error.main" | "warning.main"
> = {
  [BackgroundJobStatus.WAITING]: "secondary.main",
  [BackgroundJobStatus.RUNNING]: "primary.main",
  [BackgroundJobStatus.FINISHED]: "success.main",
  [BackgroundJobStatus.ERRORNEOUS]: "error.main",
  [BackgroundJobStatus.ABORTED]: "warning.main",
};

export const jobStatusToTypographyColor: Record<
  JobStatus,
  "secondary.main" | "primary.main" | "success.main" | "error.main" | "warning.main"
> = {
  // waiting
  [JobStatus.QUEUED]: "secondary.main",
  [JobStatus.DEFERRED]: "secondary.main",
  [JobStatus.SCHEDULED]: "secondary.main",
  // running
  [JobStatus.STARTED]: "primary.main",
  // done
  [JobStatus.FINISHED]: "success.main",
  // errors
  [JobStatus.FAILED]: "error.main",
  // aborted
  [JobStatus.STOPPED]: "warning.main",
  [JobStatus.CANCELED]: "warning.main",
};
