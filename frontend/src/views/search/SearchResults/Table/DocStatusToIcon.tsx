import { BackgroundJobStatus } from "../../../../api/openapi";
import { statusToTypographyColor } from "../../../projectsettings/update/backgroundtasks/StatusToTypographyColor";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import MoreHorizOutlinedIcon from "@mui/icons-material/MoreHorizOutlined";
import CancelIcon from "@mui/icons-material/Cancel";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { CircularProgress } from "@mui/material";

interface DocStatusToIconProps {
  docStatus: string;
}
export default function DocStatusToIcon({ docStatus }: DocStatusToIconProps) {
  return docStatus.toLowerCase() === BackgroundJobStatus.WAITING.toLowerCase() ? (
    <HourglassTopOutlinedIcon sx={{ color: statusToTypographyColor.Waiting }} />
  ) : docStatus.toLowerCase() === BackgroundJobStatus.RUNNING.toLowerCase() ? (
    <CircularProgress color="secondary" size={24} />
  ) : docStatus.toLowerCase() === BackgroundJobStatus.FINISHED.toLowerCase() ? (
    <TaskAltIcon sx={{ color: statusToTypographyColor.Finished }} />
  ) : docStatus.toLowerCase() === BackgroundJobStatus.ERRORNEOUS.toLowerCase() ? (
    <ErrorOutlineIcon sx={{ color: statusToTypographyColor.Errorneous }} />
  ) : docStatus.toLowerCase() === BackgroundJobStatus.ABORTED.toLowerCase() ? (
    <CancelIcon sx={{ color: statusToTypographyColor.Aborted }} />
  ) : (
    <MoreHorizOutlinedIcon />
  );
}
