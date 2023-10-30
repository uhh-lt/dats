import { Box, Divider, List, Toolbar, Typography } from "@mui/material";
import React, { useMemo, useRef } from "react";
import CrawlerHooks from "../../../../api/CrawlerHooks";
import { CrawlerJobRead, PreprocessingJobRead, BackgroundJobStatus, ProjectRead } from "../../../../api/openapi";
import PreProHooks from "../../../../api/PreProHooks";
import CrawlerJobListItem from "./CrawlerJobListItem";
import PreProJobListItem from "./PreProJobListItem";
import ProjectDocumentsContextMenu, { ProjectDocumentsContextMenuHandle } from "../ProjectDocumentsContextMenu";

interface ProjectBackgroundTasksProps {
  project: ProjectRead;
}

function ProjectBackgroundTasks({ project }: ProjectBackgroundTasksProps) {
  // global server state (react-query)
  const crawlerJobs = CrawlerHooks.useGetAllCrawlerJobs(project.id);
  const preProJobs = PreProHooks.useGetAllPreProJobs(project.id);

  const contextMenuRef = useRef<ProjectDocumentsContextMenuHandle>(null);

  const backgroundJobsByStatus = useMemo(() => {
    const result: Record<BackgroundJobStatus, (CrawlerJobRead | PreprocessingJobRead)[]> = {
      [BackgroundJobStatus.WAITING]: [],
      [BackgroundJobStatus.RUNNING]: [],
      [BackgroundJobStatus.FINISHED]: [],
      [BackgroundJobStatus.ERRORNEOUS]: [],
      [BackgroundJobStatus.ABORTED]: [],
    };

    if (!crawlerJobs.data && !preProJobs.data) {
      return result;
    }

    if (crawlerJobs.data) {
      for (const job of crawlerJobs.data) {
        if (!job.status) continue;
        result[job.status].push(job);
      }
    }
    if (preProJobs.data) {
      for (const job of preProJobs.data) {
        if (!job.status) continue;
        result[job.status].push(job);
      }
    }

    return result;
  }, [crawlerJobs.data, preProJobs.data]);

  return (
    <>
      {(crawlerJobs.isLoading || preProJobs.isLoading) && <>Loading background jobs...</>}
      {crawlerJobs.isError && <>An error occurred while loading crawler jobs for project {project.id}...</>}
      {preProJobs.isError && <>An error occurred while loading preprocessing jobs for project {project.id}...</>}
      {crawlerJobs.isSuccess && preProJobs.isSuccess && (
        <>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Waiting
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>
            {backgroundJobsByStatus[BackgroundJobStatus.WAITING].map((job) => {
              if ("parameters" in job) {
                return <CrawlerJobListItem key={job.id} initialCrawlerJob={job as CrawlerJobRead} />;
              } else if ("payloads" in job) {
                return (
                  <PreProJobListItem
                    key={job.id}
                    initialPreProJob={job as PreprocessingJobRead}
                    contextMenuRef={contextMenuRef}
                  />
                );
              } else {
                return null;
              }
            })}
            {backgroundJobsByStatus[BackgroundJobStatus.WAITING].length === 0 && <Typography pl={3}>empty</Typography>}
          </List>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Running
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>
            {backgroundJobsByStatus[BackgroundJobStatus.RUNNING].map((job) => {
              if ("parameters" in job) {
                return <CrawlerJobListItem key={job.id} initialCrawlerJob={job as CrawlerJobRead} />;
              } else if ("payloads" in job) {
                return (
                  <PreProJobListItem
                    key={job.id}
                    initialPreProJob={job as PreprocessingJobRead}
                    contextMenuRef={contextMenuRef}
                  />
                );
              } else {
                return null;
              }
            })}
            {backgroundJobsByStatus[BackgroundJobStatus.RUNNING].length === 0 && <Typography pl={3}>empty</Typography>}
          </List>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Finished
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>
            {backgroundJobsByStatus[BackgroundJobStatus.FINISHED].map((job) => {
              if ("parameters" in job) {
                return <CrawlerJobListItem key={job.id} initialCrawlerJob={job as CrawlerJobRead} />;
              } else if ("payloads" in job) {
                return (
                  <PreProJobListItem
                    key={job.id}
                    initialPreProJob={job as PreprocessingJobRead}
                    contextMenuRef={contextMenuRef}
                  />
                );
              } else {
                return null;
              }
            })}
            {backgroundJobsByStatus[BackgroundJobStatus.FINISHED].length === 0 && <Typography pl={3}>empty</Typography>}
          </List>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Aborted
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>
            {backgroundJobsByStatus[BackgroundJobStatus.ABORTED].map((job) => {
              if ("parameters" in job) {
                return <CrawlerJobListItem key={job.id} initialCrawlerJob={job as CrawlerJobRead} />;
              } else if ("payloads" in job) {
                return (
                  <PreProJobListItem
                    key={job.id}
                    initialPreProJob={job as PreprocessingJobRead}
                    contextMenuRef={contextMenuRef}
                  />
                );
              } else {
                return null;
              }
            })}
            {backgroundJobsByStatus[BackgroundJobStatus.ABORTED].length === 0 && <Typography pl={3}>empty</Typography>}
          </List>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Failed
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>
            {backgroundJobsByStatus[BackgroundJobStatus.ERRORNEOUS].map((job) => {
              if ("parameters" in job) {
                return <CrawlerJobListItem key={job.id} initialCrawlerJob={job as CrawlerJobRead} />;
              } else if ("payloads" in job) {
                return (
                  <PreProJobListItem
                    key={job.id}
                    initialPreProJob={job as PreprocessingJobRead}
                    contextMenuRef={contextMenuRef}
                  />
                );
              } else {
                return null;
              }
            })}
            {backgroundJobsByStatus[BackgroundJobStatus.ERRORNEOUS].length === 0 && (
              <Typography pl={3}>empty</Typography>
            )}
          </List>
        </>
      )}
      <ProjectDocumentsContextMenu ref={contextMenuRef} />
    </>
  );
}

export default ProjectBackgroundTasks;
