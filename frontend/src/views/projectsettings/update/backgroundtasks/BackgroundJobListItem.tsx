import CancelIcon from "@mui/icons-material/Cancel";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import MoreHorizOutlinedIcon from "@mui/icons-material/MoreHorizOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { CircularProgress, Collapse, IconButton, ListItem, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import React from "react";
import PreProHooks from "../../../../api/PreProHooks";
import { BackgroundJobStatus } from "../../../../api/openapi";
import { statusToTypographyColor } from "./StatusToTypographyColor";

interface BackgroundJobListItemProps {
  jobStatus?: BackgroundJobStatus;
  jobId?: string;
  abortable?: boolean;
  title: string;
  subTitle: string;
  children: React.ReactNode;
}
function BackgroundJobListItem({
  jobStatus,
  jobId,
  abortable = false,
  title,
  subTitle,
  children,
}: BackgroundJobListItemProps) {
  // local state
  const [expanded, setExpanded] = React.useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleAbortClick = () => PreProHooks.abortPreProJob(jobId!);

  return (
    <>
      <ListItem>
        <ListItemIcon>
          {jobStatus === BackgroundJobStatus.WAITING ? (
            <HourglassTopOutlinedIcon sx={{ color: statusToTypographyColor.Waiting }} />
          ) : jobStatus === BackgroundJobStatus.RUNNING ? (
            <CircularProgress color="secondary" size={24} />
          ) : jobStatus === BackgroundJobStatus.FINISHED ? (
            <TaskAltIcon sx={{ color: statusToTypographyColor.Finished }} />
          ) : jobStatus === BackgroundJobStatus.ERRORNEOUS ? (
            <ErrorOutlineIcon sx={{ color: statusToTypographyColor.Errorneous }} />
          ) : jobStatus === BackgroundJobStatus.ABORTED ? (
            <CancelIcon sx={{ color: statusToTypographyColor.Aborted }} />
          ) : (
            <MoreHorizOutlinedIcon />
          )}
        </ListItemIcon>

        <ListItemText primary={title} secondary={subTitle} />
        <Tooltip title={expanded ? "Collapse" : "Expand"}>
          <IconButton
            edge="end"
            aria-label="expand"
            size="large"
            sx={{ cursor: expanded ? "zoom-out" : "zoom-in" }}
            onClick={handleExpandClick}
          >
            {expanded ? <ExpandLess /> : <ExpandMoreIcon />}
          </IconButton>
        </Tooltip>
        {(jobStatus === BackgroundJobStatus.RUNNING || jobStatus === BackgroundJobStatus.WAITING) && abortable && (
          <Tooltip title={`Abort the Job ${jobId}`}>
            <IconButton
              edge="end"
              aria-label="abort"
              color="warning"
              size="large"
              onClick={handleAbortClick}
              sx={{ cursor: "not-allowed" }}
            >
              <CancelIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        )}
      </ListItem>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {children}
      </Collapse>
    </>
  );
}

export default BackgroundJobListItem;
