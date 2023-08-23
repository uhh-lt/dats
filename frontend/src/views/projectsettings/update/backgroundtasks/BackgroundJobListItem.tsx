import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HourglassTopOutlinedIcon from '@mui/icons-material/HourglassTopOutlined';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import {
  CircularProgress,
  Collapse, ListItemButton,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import React from "react";
import { BackgroundJobStatus } from "../../../../api/openapi";

interface BackgroundJobListItemProps {
  jobStatus?: BackgroundJobStatus;
  title: string;
  subTitle: string;
  children: React.ReactNode;
}

function BackgroundJobListItem({ jobStatus, title, subTitle, children }: BackgroundJobListItemProps) {
  // local state
  const [expanded, setExpanded] = React.useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <>
      <ListItemButton onClick={handleExpandClick}>
        <ListItemIcon>
          {jobStatus === BackgroundJobStatus.WAITING ? (
            <HourglassTopOutlinedIcon sx={{ color: "info.main" }} />
          ) : jobStatus === BackgroundJobStatus.RUNNING ? (
            <CircularProgress color="secondary" size={24} />
          ) : jobStatus === BackgroundJobStatus.FINISHED ? (
            <TaskAltIcon sx={{ color: "success.main" }} />
          ) : jobStatus === BackgroundJobStatus.ERRORNEOUS ? (
            <ErrorOutlineIcon sx={{ color: "error.main" }} />
          ) : (
            <MoreHorizOutlinedIcon />
          )}
        </ListItemIcon>

        <ListItemText
          primary={title}
          secondary={subTitle} />
        {expanded ? <ExpandLess /> : <ExpandMoreIcon />}
      </ListItemButton>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {children}
      </Collapse>
    </>
  );
}

export default BackgroundJobListItem;
