import CancelIcon from "@mui/icons-material/Cancel";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { CircularProgress } from "@mui/material";
import { ReactElement } from "react";
import { JobStatus } from "../../api/openapi/models/JobStatus.ts";
import { jobStatusToTypographyColor } from "./StatusToTypographyColor.ts";

export const jobStatusToIcon: Record<JobStatus, ReactElement> = {
  // waiting
  [JobStatus.QUEUED]: <HourglassTopOutlinedIcon sx={{ color: jobStatusToTypographyColor.queued }} />,
  [JobStatus.DEFERRED]: <HourglassTopOutlinedIcon sx={{ color: jobStatusToTypographyColor.deferred }} />,
  [JobStatus.SCHEDULED]: <HourglassTopOutlinedIcon sx={{ color: jobStatusToTypographyColor.scheduled }} />,
  // running
  [JobStatus.STARTED]: <CircularProgress size={24} sx={{ color: jobStatusToTypographyColor.started }} />,
  // done
  [JobStatus.FINISHED]: <TaskAltIcon sx={{ color: jobStatusToTypographyColor.finished }} />,
  // errors
  [JobStatus.FAILED]: <ErrorOutlineIcon sx={{ color: jobStatusToTypographyColor.failed }} />,
  // aborted
  [JobStatus.STOPPED]: <CancelIcon sx={{ color: jobStatusToTypographyColor.stopped }} />,
  [JobStatus.CANCELED]: <CancelIcon sx={{ color: jobStatusToTypographyColor.canceled }} />,
};
