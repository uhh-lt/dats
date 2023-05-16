import AddIcon from "@mui/icons-material/Add";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import {
  Box,
  Button,
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
import React, { useRef } from "react";
import CrawlerHooks from "../../../api/CrawlerHooks";
import { CrawlerJobRead, CrawlerJobStatus, ProjectRead } from "../../../api/openapi";
import CrawlerRunDialog, { CrawlerRunDialogHandle } from "./CrawlerRunDialog";

interface ProjectCrawlersProps {
  project: ProjectRead;
}

function ProjectCrawlers({ project }: ProjectCrawlersProps) {
  // global server state (react-query)
  const crawlerJobs = CrawlerHooks.useGetAllCrawlerJobs(project.id);

  // local state
  const crawlDialogRef = useRef<CrawlerRunDialogHandle>(null);

  return (
    <>
      <Toolbar variant="dense">
        <Typography variant="h6" color="inherit" component="div">
          Monitor crawler jobs
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          component="label"
          startIcon={<AddIcon />}
          onClick={() => crawlDialogRef.current!.open()}
        >
          New Job
        </Button>
      </Toolbar>
      <Divider />
      {crawlerJobs.isLoading && <>Loading crawler jobs...</>}
      {crawlerJobs.isError && <>An error occurred while loading crawler jobs for project {project.id}...</>}
      {crawlerJobs.isSuccess && (
        <List>
          {crawlerJobs.data.map((job) => (
            <CrawlerJobListItem key={job.id} crawlerJob={job} />
          ))}
        </List>
      )}
      <CrawlerRunDialog projectId={project.id} ref={crawlDialogRef} />
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
        <List component="div" disablePadding dense>
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

export default ProjectCrawlers;
