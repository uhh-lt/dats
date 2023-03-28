import { useMutation, useQuery } from "@tanstack/react-query";
import { CrawlerJobRead, CrawlerJobStatus, CrawlerService } from "./openapi";
import { QueryKey } from "./QueryKey";

const useStartCrawlerJob = () => useMutation(CrawlerService.startCrawlerJob);

const useGetCrawlerJob = (crawlerJobId: string | undefined) => {
  // filter out all disabled code ids
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
    }
  );
};

const CrawlerHooks = {
  useGetCrawlerJob,
  useStartCrawlerJob,
};

export default CrawlerHooks;
