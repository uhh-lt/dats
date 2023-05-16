import { useMutation, useQuery } from "@tanstack/react-query";
import { CrawlerJobRead, CrawlerJobStatus, CrawlerService } from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

const useStartCrawlerJob = () =>
  useMutation(CrawlerService.startCrawlerJob, {
    onSuccess: (job) => {
      // force refetch of all crawler jobs when adding a new one
      queryClient.invalidateQueries([QueryKey.PROJECT_CRAWLER_JOBS, job.parameters.project_id]);
    },
  });

const useGetCrawlerJob = (crawlerJobId: string | undefined, initialData: CrawlerJobRead | undefined) => {
  return useQuery<CrawlerJobRead, Error>(
    [QueryKey.CRAWLER_JOB, crawlerJobId],
    () =>
      CrawlerService.getCrawlerJob({
        crawlerJobId: crawlerJobId!,
      }),
    {
      enabled: !!crawlerJobId,
      refetchInterval(data, query) {
        if (!data) {
          return 1000;
        }
        if (data.status) {
          switch (data.status) {
            case CrawlerJobStatus.FAILED:
            case CrawlerJobStatus.DONE:
              return false;
            case CrawlerJobStatus.INIT:
            case CrawlerJobStatus.IN_PROGRESS:
              return 1000;
          }
        }
        return false;
      },
      initialData,
    }
  );
};

const useGetAllCrawlerJobs = (projectId: number | undefined) => {
  return useQuery<CrawlerJobRead[], Error>(
    [QueryKey.PROJECT_CRAWLER_JOBS, projectId],
    () =>
      CrawlerService.getAllCrawlerJobs({
        projectId: projectId!,
      }),
    {
      enabled: !!projectId,
    }
  );
};

const CrawlerHooks = {
  useGetCrawlerJob,
  useStartCrawlerJob,
  useGetAllCrawlerJobs,
};

export default CrawlerHooks;
