import { queryClient } from "@api/queryClient";
import { projectQueries } from "@core/project";
import { searchQueries } from "@core/source-document";
import { CrawlerJobRead } from "@models/CrawlerJobRead";
import { SDocStatus } from "@models/SDocStatus";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useJobRefetchInterval } from "./jobPolling";
import { jobQueries } from "./jobQueries";

export const useLiveCrawlerJob = (crawlerJobId: string | undefined, initialData: CrawlerJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<CrawlerJobRead>();
  return useQuery({
    ...jobQueries.crawler.byId(crawlerJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

// this query is polling the processing status of simple SDocs every 3 seconds
export const usePollProcessingSimpleSdocStatus = (projectId: number) => {
  const previousLengthRef = useRef<number>(0);
  return useQuery({
    ...projectQueries.sdocStatusSimple(projectId, SDocStatus._0),
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 3000;
      }
      const currentLength = query.state.data.length;
      // Only invalidate if previous length > 0 and current length == 0
      if (previousLengthRef.current > 0 && currentLength === 0) {
        console.log("Invalidating documents");
        queryClient.invalidateQueries({ queryKey: searchQueries.documentsByProject(projectId) });
      }
      previousLengthRef.current = currentLength;
      return 3000;
    },
  });
};
