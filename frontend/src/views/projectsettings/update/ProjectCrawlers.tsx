import React, { useRef } from "react";
import {
  Box,
  Button,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { CrawlerJobParameters, CrawlerJobRead, CrawlerJobStatus, ProjectRead } from "../../../api/openapi";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CrawlerRunDialog, { CrawlerRunDialogHandle } from "./CrawlerRunDialog";

const listUrlsReadable = (params: CrawlerJobParameters) => {
  if (params && params.urls) {
    return params.urls.join("\n");
  }
  return "";
};

interface ProjectCrawlersProps {
  project: ProjectRead;
}

function ProjectCrawlers({ project }: ProjectCrawlersProps) {
  // global server state (react-query)
  const projectCrawlers = {
    isLoading: false,
    isError: false,
    isSuccess: true,
    data: [
      {
        status: CrawlerJobStatus.IN_PROGRESS,
        id: "test",
        parameters: {
          project_id: 1,
          urls: ["https://www.tagesschau.de/ausland/ungarn-putin-haftbefehl-ukraine-101.html"],
        } as CrawlerJobParameters,
        output_dir: "",
        images_store_path: "",
        created: "",
      } as CrawlerJobRead,
    ],
  }; // CrawlerHooks.useGetCrawlerJobs(project.id);

  // local state
  const crawlDialogRef = useRef<CrawlerRunDialogHandle>(null);

  return (
    <React.Fragment>
      <Toolbar variant="dense">
        <Typography variant="h6" color="inherit" component="div">
          Crawl URLs
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
          onClick={() => crawlDialogRef.current!.open()}
        >
          Input URLs
        </Button>
      </Toolbar>
      <Divider />
      {projectCrawlers.isLoading && <CardContent>Loading project documents...</CardContent>}
      {projectCrawlers.isError && (
        <CardContent>An error occurred while loading project documents for project {project.id}...</CardContent>
      )}
      {projectCrawlers.isSuccess && (
        <List>
          {projectCrawlers.data.map((job) => (
            <ListItem disablePadding key={job.id}>
              <ListItemButton>
                <ListItemText primary={job.id} secondary={listUrlsReadable(job.parameters)} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
      <CrawlerRunDialog projectId={project.id} ref={crawlDialogRef} />
    </React.Fragment>
  );
}

export default ProjectCrawlers;
