import CancelIcon from "@mui/icons-material/Cancel";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Collapse, IconButton, ListItem, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import { memo, useCallback, useState } from "react";
import PreProHooks from "../../api/PreProHooks.ts";
import { JobStatus } from "../../api/openapi/models/JobStatus.ts";
import { jobStatusToIcon } from "./StatusToIcon.tsx";

const RUNNING_OR_WAITING = [JobStatus.QUEUED, JobStatus.DEFERRED, JobStatus.SCHEDULED, JobStatus.STARTED];

interface JobListItemProps {
  jobStatus: JobStatus;
  jobId: string;
  abortable?: boolean;
  title: string;
  subTitle: string;
  children: React.ReactNode;
}

function JobListItem({ jobStatus, jobId, abortable = false, title, subTitle, children }: JobListItemProps) {
  // local state
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleAbortClick = useCallback(() => {
    if (jobId) {
      PreProHooks.abortPreProJob(jobId);
    }
  }, [jobId]);

  return (
    <>
      <ListItem>
        <ListItemIcon>{jobStatusToIcon[jobStatus]}</ListItemIcon>

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
        {RUNNING_OR_WAITING.includes(jobStatus) && abortable && (
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

export default memo(JobListItem);
