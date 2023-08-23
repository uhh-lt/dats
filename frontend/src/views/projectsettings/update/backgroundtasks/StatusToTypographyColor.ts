import { BackgroundJobStatus } from "../../../../api/openapi";

export const statusToTypographyColor: Record<BackgroundJobStatus, "secondary.main" | "primary.main" | "success.main" | "error.main"> = {
  [BackgroundJobStatus.WAITING]: "secondary.main",
  [BackgroundJobStatus.RUNNING]: "primary.main",
  [BackgroundJobStatus.FINISHED]: "success.main",
  [BackgroundJobStatus.ERRORNEOUS]: "error.main",
};