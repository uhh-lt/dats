import { JobStatus } from "../../api/openapi/models/JobStatus.ts";

export const jobStatusToSimple: Record<JobStatus, "running" | "finished" | "error"> = {
  // waiting
  [JobStatus.QUEUED]: "running",
  [JobStatus.DEFERRED]: "running",
  [JobStatus.SCHEDULED]: "running",
  // running
  [JobStatus.STARTED]: "running",
  // finished
  [JobStatus.FINISHED]: "finished",
  // errors
  [JobStatus.FAILED]: "error",
  // aborted
  [JobStatus.STOPPED]: "error",
  [JobStatus.CANCELED]: "error",
};
