import { Box, Divider, List, Toolbar, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import CrawlerHooks from "../../../api/CrawlerHooks.ts";
import LLMHooks from "../../../api/LLMHooks.ts";
import MLHooks from "../../../api/MLHooks.ts";
import PreProHooks from "../../../api/PreProHooks.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { ProjectRead } from "../../../api/openapi/models/ProjectRead.ts";
import CrawlerJobListItem from "./CrawlerJobListItem.tsx";
import LLMJobListItem from "./LLMJobListItem.tsx";
import MLJobListItem from "./MLJobListItem.tsx";
import PreProJobListItem from "./PreProJobListItem.tsx";

interface ProjectBackgroundTasksProps {
  project: ProjectRead;
}

function ProjectBackgroundTasks({ project }: ProjectBackgroundTasksProps) {
  // global server state (react-query)
  const { data: crawlerJobs } = CrawlerHooks.useGetAllCrawlerJobs(project.id);
  const { data: llmJobs } = LLMHooks.useGetAllLLMJobs(project.id);
  const { data: mlJobs } = MLHooks.useGetAllMLJobs(project.id);
  const { data: preproJobs } = PreProHooks.useGetAllPreProJobs(project.id);

  // Memoize filtered jobs
  const runningCrawlerJobs = useMemo(
    () => crawlerJobs?.filter((job) => job.status === BackgroundJobStatus.RUNNING) || [],
    [crawlerJobs],
  );

  const finishedCrawlerJobs = useMemo(
    () => crawlerJobs?.filter((job) => job.status !== BackgroundJobStatus.RUNNING) || [],
    [crawlerJobs],
  );

  const runningLLMJobs = useMemo(
    () => llmJobs?.filter((job) => job.status === BackgroundJobStatus.RUNNING) || [],
    [llmJobs],
  );

  const finishedLLMJobs = useMemo(
    () => llmJobs?.filter((job) => job.status !== BackgroundJobStatus.RUNNING) || [],
    [llmJobs],
  );

  const runningMLJobs = useMemo(
    () => mlJobs?.filter((job) => job.status === BackgroundJobStatus.RUNNING) || [],
    [mlJobs],
  );

  const finishedMLJobs = useMemo(
    () => mlJobs?.filter((job) => job.status !== BackgroundJobStatus.RUNNING) || [],
    [mlJobs],
  );

  const runningPreproJobs = useMemo(
    () => preproJobs?.filter((job) => job.status === BackgroundJobStatus.RUNNING) || [],
    [preproJobs],
  );

  const finishedPreproJobs = useMemo(
    () => preproJobs?.filter((job) => job.status !== BackgroundJobStatus.RUNNING) || [],
    [preproJobs],
  );

  return (
    <Box sx={{ height: "100%" }}>
      <Toolbar>
        <Typography variant="h6" component="div">
          Background Tasks
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ width: "100%", bgcolor: "background.paper" }} component="nav">
        {/* Running Jobs */}
        {runningCrawlerJobs.length > 0 && (
          <>
            <ListHeader text="Running Crawler Jobs" />
            {runningCrawlerJobs.map((job) => (
              <CrawlerJobListItem key={job.id} initialCrawlerJob={job} />
            ))}
          </>
        )}
        {runningLLMJobs.length > 0 && (
          <>
            <ListHeader text="Running LLM Jobs" />
            {runningLLMJobs.map((job) => (
              <LLMJobListItem key={job.id} initialLLMJob={job} />
            ))}
          </>
        )}
        {runningMLJobs.length > 0 && (
          <>
            <ListHeader text="Running ML Jobs" />
            {runningMLJobs.map((job) => (
              <MLJobListItem key={job.id} initialMLJob={job} />
            ))}
          </>
        )}
        {runningPreproJobs.length > 0 && (
          <>
            <ListHeader text="Running Preprocessing Jobs" />
            {runningPreproJobs.map((job) => (
              <PreProJobListItem key={job.id} initialPreProJob={job} />
            ))}
          </>
        )}

        {/* Finished Jobs */}
        {finishedCrawlerJobs.length > 0 && (
          <>
            <ListHeader text="Finished Crawler Jobs" />
            {finishedCrawlerJobs.map((job) => (
              <CrawlerJobListItem key={job.id} initialCrawlerJob={job} />
            ))}
          </>
        )}
        {finishedLLMJobs.length > 0 && (
          <>
            <ListHeader text="Finished LLM Jobs" />
            {finishedLLMJobs.map((job) => (
              <LLMJobListItem key={job.id} initialLLMJob={job} />
            ))}
          </>
        )}
        {finishedMLJobs.length > 0 && (
          <>
            <ListHeader text="Finished ML Jobs" />
            {finishedMLJobs.map((job) => (
              <MLJobListItem key={job.id} initialMLJob={job} />
            ))}
          </>
        )}
        {finishedPreproJobs.length > 0 && (
          <>
            <ListHeader text="Finished Preprocessing Jobs" />
            {finishedPreproJobs.map((job) => (
              <PreProJobListItem key={job.id} initialPreProJob={job} />
            ))}
          </>
        )}
      </List>
    </Box>
  );
}

function ListHeader({ text }: { text: string }) {
  return (
    <>
      <Toolbar>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          {text}
        </Typography>
      </Toolbar>
      <Divider />
    </>
  );
}

export default memo(ProjectBackgroundTasks);
