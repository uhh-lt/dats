import { Box, Divider, List, Toolbar, Typography } from "@mui/material";
import { useMemo } from "react";
import CrawlerHooks from "../../../api/CrawlerHooks.ts";
import LLMHooks from "../../../api/LLMHooks.ts";
import PreProHooks from "../../../api/PreProHooks.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { CrawlerJobRead } from "../../../api/openapi/models/CrawlerJobRead.ts";
import { LLMJobRead } from "../../../api/openapi/models/LLMJobRead.ts";
import { PreprocessingJobRead } from "../../../api/openapi/models/PreprocessingJobRead.ts";
import { ProjectRead } from "../../../api/openapi/models/ProjectRead.ts";
import CrawlerJobListItem from "./CrawlerJobListItem.tsx";
import LLMJobListItem from "./LLMJobListItem.tsx";
import PreProJobListItem from "./PreProJobListItem.tsx";

// type guards
const isCrawlerJob = (job: CrawlerJobRead | PreprocessingJobRead | LLMJobRead): job is CrawlerJobRead => {
  return "output_dir" in job;
};
const isPreProJob = (job: CrawlerJobRead | PreprocessingJobRead | LLMJobRead): job is PreprocessingJobRead => {
  return "payloads" in job;
};
const isLLMJob = (job: CrawlerJobRead | PreprocessingJobRead | LLMJobRead): job is LLMJobRead => {
  return "num_steps_finished" in job;
};

interface ProjectBackgroundTasksProps {
  project: ProjectRead;
}

function ProjectBackgroundTasks({ project }: ProjectBackgroundTasksProps) {
  // global server state (react-query)
  const crawlerJobs = CrawlerHooks.useGetAllCrawlerJobs(project.id);
  const preProJobs = PreProHooks.useGetAllPreProJobs(project.id);
  const llmJobs = LLMHooks.useGetAllLLMJobs(project.id);

  const backgroundJobsByStatus = useMemo(() => {
    const result: Record<BackgroundJobStatus, (CrawlerJobRead | PreprocessingJobRead | LLMJobRead)[]> = {
      [BackgroundJobStatus.WAITING]: [],
      [BackgroundJobStatus.RUNNING]: [],
      [BackgroundJobStatus.FINISHED]: [],
      [BackgroundJobStatus.ERRORNEOUS]: [],
      [BackgroundJobStatus.ABORTED]: [],
    };

    if (!crawlerJobs.data && !preProJobs.data && !llmJobs.data) {
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
    if (llmJobs.data) {
      for (const job of llmJobs.data) {
        if (!job.status) continue;
        result[job.status].push(job);
      }
    }

    return result;
  }, [crawlerJobs.data, preProJobs.data, llmJobs.data]);

  // rendering
  const renderBackgroundJobs = (status: BackgroundJobStatus) => {
    return (
      <>
        {backgroundJobsByStatus[status].map((job) => {
          if (isCrawlerJob(job)) {
            return <CrawlerJobListItem key={job.id} initialCrawlerJob={job} />;
          } else if (isPreProJob(job)) {
            return <PreProJobListItem key={job.id} initialPreProJob={job} />;
          } else if (isLLMJob(job)) {
            return <LLMJobListItem key={job.id} initialLLMJob={job} />;
          } else {
            return null;
          }
        })}
        {backgroundJobsByStatus[status].length === 0 && <Typography pl={3}>empty</Typography>}
      </>
    );
  };

  return (
    <>
      {(crawlerJobs.isLoading || preProJobs.isLoading || llmJobs.isLoading) && <>Loading background jobs...</>}
      {crawlerJobs.isError && <>An error occurred while loading crawler jobs for project {project.id}...</>}
      {preProJobs.isError && <>An error occurred while loading preprocessing jobs for project {project.id}...</>}
      {llmJobs.isError && <>An error occurred while loading llm jobs for project {project.id}...</>}
      {crawlerJobs.isSuccess && preProJobs.isSuccess && llmJobs.isSuccess && (
        <>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Waiting
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>{renderBackgroundJobs(BackgroundJobStatus.WAITING)}</List>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Running
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>{renderBackgroundJobs(BackgroundJobStatus.RUNNING)}</List>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Finished
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>{renderBackgroundJobs(BackgroundJobStatus.FINISHED)}</List>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Aborted
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>{renderBackgroundJobs(BackgroundJobStatus.ABORTED)}</List>
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Failed
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>{renderBackgroundJobs(BackgroundJobStatus.ERRORNEOUS)}</List>
        </>
      )}
    </>
  );
}

export default ProjectBackgroundTasks;
