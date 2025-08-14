import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { dateToLocaleDate } from "../utils/DateUtils.ts";
import { CrawlerJobRead } from "./openapi/models/CrawlerJobRead.ts";
import { JobStatus } from "./openapi/models/JobStatus.ts";
import { SDocStatus } from "./openapi/models/SDocStatus.ts";
import { SourceDocumentStatusRead } from "./openapi/models/SourceDocumentStatusRead.ts";
import { DocprocessingService } from "./openapi/services/DocprocessingService.ts";
import { JobService } from "./openapi/services/JobService.ts";
import { QueryKey } from "./QueryKey.ts";

const useStartCrawlerJob = () =>
  useMutation({
    mutationFn: JobService.startCrawlerJob,
    onSuccess: (job) => {
      // force refetch of all crawler jobs when adding a new one
      console.log("Invalidating project crawler jobs");
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CRAWLER_JOBS, job.input.project_id] });
    },
    meta: {
      successMessage: (data: CrawlerJobRead) => `Started Crawler Job as a new background task (ID: ${data.job_id})`,
    },
  });

const usePollCrawlerJob = (crawlerJobId: string | undefined, initialData: CrawlerJobRead | undefined) => {
  return useQuery<CrawlerJobRead, Error>({
    queryKey: [QueryKey.CRAWLER_JOB, crawlerJobId],
    queryFn: () =>
      JobService.getCrawlerJobById({
        jobId: crawlerJobId!,
      }),
    enabled: !!crawlerJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }

      // do invalidation if the status is FINISHED (and the job is max 3 minutes old)
      const localDate = new Date();
      if (
        query.state.data.finished &&
        localDate.getTime() - dateToLocaleDate(query.state.data.finished).getTime() < 3 * 60 * 1000
      ) {
        const projectId = query.state.data.project_id;
        setTimeout(() => {
          console.log("Invalidating project sdoc status");
          queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_SDOC_STATUS, projectId] });
        }, 1000);
      }

      if (query.state.data.status) {
        switch (query.state.data.status) {
          case JobStatus.CANCELED:
          case JobStatus.FAILED:
          case JobStatus.FINISHED:
          case JobStatus.STOPPED:
            return false;
          case JobStatus.DEFERRED:
          case JobStatus.QUEUED:
          case JobStatus.SCHEDULED:
          case JobStatus.STARTED:
            return 1000;
        }
      }
      return false;
    },
    initialData,
  });
};

const useGetAllCrawlerJobs = (projectId: number) => {
  return useQuery<CrawlerJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_CRAWLER_JOBS, projectId],
    queryFn: () =>
      JobService.getCrawlerJobsByProject({
        projectId: projectId!,
      }),
    enabled: !!projectId,
  });
};

const useUploadDocument = () =>
  useMutation({
    mutationFn: DocprocessingService.uploadFiles,
    onSuccess: (_, variables) => {
      setTimeout(() => {
        console.log("Invalidating project sdoc status");
        queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_SDOC_STATUS, variables.projId] });
      }, 3000);
    },
    meta: {
      successMessage: (data: string) =>
        `Successfully uploaded documents and started PreprocessingJob in the background! (${data})`,
    },
  });

const usePollAllSdocStatus = (projectId: number, status: SDocStatus) => {
  return useQuery<SourceDocumentStatusRead[], Error>({
    queryKey: [QueryKey.PROJECT_SDOC_STATUS, projectId, status],
    queryFn: () =>
      DocprocessingService.getSdocStatusByProjectAndStatus({
        projId: projectId!,
        status: status!,
      }),
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }

      if (query.state.data.length == 0) {
        // do invalidation if all documents are processed
        console.log("Invalidating documents");
        queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE, projectId] });
        return false;
      } else {
        return 1000;
      }
    },
  });
};

const DocProcessingHooks = {
  // crawler
  useStartCrawlerJob,
  usePollCrawlerJob,
  useGetAllCrawlerJobs,
  useUploadDocument,
  usePollAllSdocStatus,
};

export default DocProcessingHooks;
