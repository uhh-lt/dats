import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";

export const statusToColor: Record<BackgroundJobStatus, "default" | "primary" | "success" | "error" | "warning"> = {
  [BackgroundJobStatus.WAITING]: "default",
  [BackgroundJobStatus.RUNNING]: "primary",
  [BackgroundJobStatus.FINISHED]: "success",
  [BackgroundJobStatus.ERRORNEOUS]: "error",
  [BackgroundJobStatus.ABORTED]: "error",
};
