import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { dateToLocaleDate } from "../utils/DateUtils.ts";
import { QueryKey } from "./QueryKey.ts";
import { BackgroundJobStatus } from "./openapi/models/BackgroundJobStatus.ts";
import { CrawlerJobRead } from "./openapi/models/CrawlerJobRead.ts";
import { CrawlerService } from "./openapi/services/CrawlerService.ts";

const useStartCrawlerJob = () =>
  useMutation({
    mutationFn: CrawlerService.startCrawlerJob,
    onSuccess: (job) => {
      // force refetch of all crawler jobs when adding a new one
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CRAWLER_JOBS, job.parameters.project_id] });
    },
    meta: {
      successMessage: (data: CrawlerJobRead) => `Started URL Import as a new background task (ID: ${data.id})`,
    },
  });

const usePollCrawlerJob = (crawlerJobId: string | undefined, initialData: CrawlerJobRead | undefined) => {
  return useQuery<CrawlerJobRead, Error>({
    queryKey: [QueryKey.CRAWLER_JOB, crawlerJobId],
    queryFn: () =>
      CrawlerService.getCrawlerJob({
        crawlerJobId: crawlerJobId!,
      }),
    enabled: !!crawlerJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }

      if (query.state.data.status) {
        // do invalidation if the status is FINISHED (and the job is max 3 minutes old)
        const localDate = new Date();
        const localUpdatedDate = dateToLocaleDate(query.state.data.updated);
        if (
          query.state.data.status === BackgroundJobStatus.FINISHED &&
          localDate.getTime() - localUpdatedDate.getTime() < 3 * 60 * 1000
        ) {
          const projectId = query.state.data.parameters.project_id;
          console.log("Invalidating preprocessing jobs");
          queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_PREPROCESSING_JOBS, projectId] });
        }
      }

      if (query.state.data.status) {
        switch (query.state.data.status) {
          case BackgroundJobStatus.ERRORNEOUS:
          case BackgroundJobStatus.FINISHED:
            return false;
          case BackgroundJobStatus.WAITING:
          case BackgroundJobStatus.RUNNING:
            return 1000;
        }
      }
      return false;
    },
    initialData,
  });
};

const useGetAllCrawlerJobs = (projectId: number | null | undefined) => {
  return useQuery<CrawlerJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_CRAWLER_JOBS, projectId],
    queryFn: () =>
      CrawlerService.getAllCrawlerJobs({
        projectId: projectId!,
      }),
    enabled: !!projectId,
  });
};

const CrawlerHooks = {
  usePollCrawlerJob,
  useStartCrawlerJob,
  useGetAllCrawlerJobs,
};

export default CrawlerHooks;
