import { getIconComponent, JobStatusIcons } from "@components/icons";
import { JobStatus } from "@models/JobStatus";
import CancelIcon from "@mui/icons-material/Cancel";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ReplayIcon from "@mui/icons-material/Replay";
import { Collapse, IconButton, ListItem, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { hasJobActions, type JobActionQueries, type JobQueriesWithActions } from "./createJobQueries";
import { JobHooks } from "./jobHooks";
import { jobStatusToTypographyColor } from "./JobStatusToTypographyColor";

// the backend stops a started job only, and retries a failed or stopped one
const ABORTABLE = [JobStatus.STARTED];
const RETRYABLE = [JobStatus.FAILED, JobStatus.STOPPED];

interface JobListItemProps {
  jobStatus: JobStatus;
  projectId: number;
  jobId: string;
  // the queries of the job's type (`xQueries.job`): their actions are offered
  jobQueries: JobActionQueries;
  title: string;
  subTitle: string;
  children: React.ReactNode;
}

export const JobListItem = memo(
  ({ jobStatus, projectId, jobId, jobQueries, title, subTitle, children }: JobListItemProps) => {
    // local state
    const [expanded, setExpanded] = useState(false);

    const handleExpandClick = useCallback(() => {
      setExpanded((prev) => !prev);
    }, []);

    return (
      <>
        <ListItem>
          <ListItemIcon sx={{ color: jobStatusToTypographyColor[jobStatus] }}>
            {getIconComponent(JobStatusIcons[jobStatus])}
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
          {hasJobActions(jobQueries) && (
            <JobActionButtons jobStatus={jobStatus} projectId={projectId} jobId={jobId} jobQueries={jobQueries} />
          )}
        </ListItem>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {children}
        </Collapse>
      </>
    );
  },
);

interface JobActionButtonsProps {
  jobStatus: JobStatus;
  projectId: number;
  jobId: string;
  jobQueries: JobQueriesWithActions;
}

// The abort and retry of a job; its new state arrives as a job update (JOB_UPDATED).
function JobActionButtons({ jobStatus, projectId, jobId, jobQueries }: JobActionButtonsProps) {
  const { mutate: abort, isPending: isAborting } = JobHooks.useAbortJob(jobQueries);
  const { mutate: retry, isPending: isRetrying } = JobHooks.useRetryJob(jobQueries);

  const handleAbortClick = useCallback(() => abort({ projectId, jobId }), [abort, projectId, jobId]);
  const handleRetryClick = useCallback(() => retry({ projectId, jobId }), [retry, projectId, jobId]);

  if (ABORTABLE.includes(jobStatus)) {
    return (
      <Tooltip title="Abort the job">
        <IconButton
          edge="end"
          aria-label="abort"
          color="warning"
          size="large"
          loading={isAborting}
          onClick={handleAbortClick}
        >
          <CancelIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
    );
  }
  if (RETRYABLE.includes(jobStatus)) {
    return (
      <Tooltip title="Retry the job">
        <IconButton edge="end" aria-label="retry" size="large" loading={isRetrying} onClick={handleRetryClick}>
          <ReplayIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
    );
  }
  return null;
}
