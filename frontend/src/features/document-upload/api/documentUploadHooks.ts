import { queryClient } from "@api/queryClient";
import { DocprocessingService } from "@api/services/DocprocessingService";
import { JobService } from "@api/services/JobService";
import { projectQueries } from "@core/project";
import { sdocQueries } from "@core/source-document";
import { CrawlerJobRead } from "@models/CrawlerJobRead";
import { SDocStatus } from "@models/SDocStatus";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { documentUploadQueries } from "./documentUploadQueries";

// this query is polling the processing status of simple SDocs every 3 seconds
const usePollProcessingSimpleSdocStatus = (projectId: number) => {
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
        queryClient.invalidateQueries({ queryKey: sdocQueries.searchByProject(projectId) });
      }
      previousLengthRef.current = currentLength;
      return 3000;
    },
  });
};

const useStartCrawlerJob = () =>
  useMutation({
    mutationKey: [...documentUploadQueries.job.all(), "start"],
    mutationFn: JobService.startCrawlerJob,
    onSuccess: (job) => {
      setTimeout(() => {
        console.log("Invalidating project crawler jobs");
        queryClient.invalidateQueries({
          queryKey: documentUploadQueries.job.byProject(job.input.project_id).queryKey,
        });
      }, 1000);
    },
    meta: {
      successMessage: (data: CrawlerJobRead) => `Started Crawler Job as a new background task (ID: ${data.job_id})`,
    },
  });

const useUploadDocument = () =>
  useMutation({
    mutationKey: [...documentUploadQueries.all(), "uploadDocument"],
    mutationFn: DocprocessingService.uploadFiles,
    meta: {
      successMessage: (data: number) =>
        `Successfully uploaded ${data} documents and started PreprocessingJob in the background!`,
    },
  });

export const DocumentUploadHooks = {
  usePollProcessingSimpleSdocStatus,
  useStartCrawlerJob,
  useUploadDocument,
};
