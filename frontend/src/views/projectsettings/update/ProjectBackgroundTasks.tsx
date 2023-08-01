import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import {
  Box,
  CircularProgress,
  Collapse,
  Divider,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { useMemo } from "react";
import CrawlerHooks from "../../../api/CrawlerHooks";
import { CrawlerJobRead, CrawlerJobStatus, ProjectRead } from "../../../api/openapi";

interface ProjectBackgroundTasksProps {
  project: ProjectRead;
}

function ProjectBackgroundTasks({ project }: ProjectBackgroundTasksProps) {
  // global server state (react-query)
  const crawlerJobs = CrawlerHooks.useGetAllCrawlerJobs(project.id);

  const crawlerJobsByStatus = useMemo(() => {
    const result: Record<CrawlerJobStatus, CrawlerJobRead[]> = {
      [CrawlerJobStatus.INIT]: [],
      [CrawlerJobStatus.IN_PROGRESS]: [],
      [CrawlerJobStatus.DONE]: [],
      [CrawlerJobStatus.FAILED]: [],
    };

    if (!crawlerJobs.data) {
      return result;
    }

    for (const job of crawlerJobs.data) {
      if (!job.status) continue;
      result[job.status].push(job);
    }
    return result;
  }, [crawlerJobs.data]);

  return (
    <>
      {crawlerJobs.isLoading && <>Loading crawler jobs...</>}
      {crawlerJobs.isError && <>An error occurred while loading crawler jobs for project {project.id}...</>}
      {crawlerJobs.isSuccess && (
        <>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Active background tasks
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>
            {crawlerJobsByStatus[CrawlerJobStatus.INIT].map((job) => (
              <CrawlerJobListItem key={job.id} crawlerJob={job} />
            ))}
            {crawlerJobsByStatus[CrawlerJobStatus.IN_PROGRESS].map((job) => (
              <CrawlerJobListItem key={job.id} crawlerJob={job} />
            ))}
            {crawlerJobsByStatus[CrawlerJobStatus.INIT].length === 0 &&
              crawlerJobsByStatus[CrawlerJobStatus.IN_PROGRESS].length === 0 && <Typography pl={3}>empty</Typography>}
          </List>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Finished background tasks
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>
            {crawlerJobsByStatus[CrawlerJobStatus.DONE].map((job) => (
              <CrawlerJobListItem key={job.id} crawlerJob={job} />
            ))}
            {crawlerJobsByStatus[CrawlerJobStatus.DONE].length === 0 && <Typography pl={3}>empty</Typography>}
          </List>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Failed background tasks
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>
            {crawlerJobsByStatus[CrawlerJobStatus.FAILED].map((job) => (
              <CrawlerJobListItem key={job.id} crawlerJob={job} />
            ))}
            {crawlerJobsByStatus[CrawlerJobStatus.FAILED].length === 0 && <Typography pl={3}>empty</Typography>}
          </List>
        </>
      )}
    </>
  );
}

function CrawlerJobListItem({ crawlerJob }: { crawlerJob: CrawlerJobRead }) {
  // global server state (react-query)
  const crawlerJobStatus = CrawlerHooks.useGetCrawlerJob(crawlerJob.id, crawlerJob);

  // local state
  const [expanded, setExpanded] = React.useState(false);
  const date = new Date(crawlerJob.created);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <>
      <ListItemButton onClick={handleExpandClick}>
        {crawlerJobStatus.isSuccess && (
          <ListItemIcon>
            {crawlerJobStatus.data.status === CrawlerJobStatus.INIT ? (
              <InfoOutlinedIcon sx={{ color: "info.main" }} />
            ) : crawlerJobStatus.data.status === CrawlerJobStatus.IN_PROGRESS ? (
              <CircularProgress color="secondary" size={24} />
            ) : crawlerJobStatus.data.status === CrawlerJobStatus.DONE ? (
              <TaskAltIcon sx={{ color: "success.main" }} />
            ) : (
              <ErrorOutlineIcon sx={{ color: "error.main" }} />
            )}
          </ListItemIcon>
        )}
        <ListItemText
          primary={`Job: ${crawlerJob.id}`}
          secondary={`${date.toLocaleTimeString()}, ${date.toDateString()}`}
        />
        {expanded ? <ExpandLess /> : <ExpandMoreIcon />}
      </ListItemButton>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List component="div" disablePadding dense sx={{ maxHeight: 180, overflowY: "auto" }}>
          {crawlerJob.parameters.urls.map((url, index) => (
            <ListItemButton key={index} component={Link} href={url} target="_blank">
              <ListItemIcon></ListItemIcon>
              <ListItemText primary={url} />
            </ListItemButton>
          ))}
        </List>
      </Collapse>
    </>
  );
}

export default ProjectBackgroundTasks;
