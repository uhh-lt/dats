import { BackgroundJobStatus } from "../../../../api/openapi/models/BackgroundJobStatus.ts";

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
