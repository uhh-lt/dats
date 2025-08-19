import { JobStatus } from "../../api/openapi/models/JobStatus.ts";

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
