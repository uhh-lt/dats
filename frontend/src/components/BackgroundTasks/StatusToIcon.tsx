import CancelIcon from "@mui/icons-material/Cancel";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { CircularProgress } from "@mui/material";
import React from "react";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";

export const statusToIcon: Record<BackgroundJobStatus, React.ReactElement> = {
  [BackgroundJobStatus.WAITING]: <HourglassTopOutlinedIcon />,
  [BackgroundJobStatus.RUNNING]: <CircularProgress size={24} />,
  [BackgroundJobStatus.FINISHED]: <TaskAltIcon />,
  [BackgroundJobStatus.ERRORNEOUS]: <ErrorOutlineIcon />,
  [BackgroundJobStatus.ABORTED]: <CancelIcon />,
};
