import { ClassifierDatasetStatisticsParams, classifierQueries } from "@api/queries/classifierQueries";
import { jobQueries } from "@api/queries/jobQueries";
import { queryClient } from "@api/queryClient";
import { ClassifierService } from "@api/services/ClassifierService";
import { ClassifierJobRead } from "@models/ClassifierJobRead";
import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierRead } from "@models/ClassifierRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useJobRefetchInterval } from "./jobPolling";

const useStartClassifierJob = () =>
  useMutation({
    mutationKey: [...classifierQueries.all(), "startClassifierJob"],
    mutationFn: ClassifierService.startClassifierJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: jobQueries.classifier.byProject(job.project_id).queryKey });
    },
    meta: {
      successMessage: (data: ClassifierJobRead) =>
        `Started Classifier Job as a new background task (ID: ${data.job_id})`,
    },
  });

// Job updates arrive via websocket (JOB_UPDATED); the completion side-effects
// (classifier list + sdoc tag invalidations) live in the JOB_UPDATED handler in
// frontend/src/plugins/websocket/websocketEventHandlers.ts.
const useLiveClassifierJob = (classifierJobId: string | undefined, initialData: ClassifierJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<ClassifierJobRead>();
  return useQuery({
    ...jobQueries.classifier.byId(classifierJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useGetAllClassifiers = (projectId: number) =>
  useQuery({
    ...classifierQueries.byProject(projectId),
    select: (data) => Object.values(data),
  });

const useUpdateClassifier = () =>
  useMutation({
    mutationKey: [...classifierQueries.all(), "updateClassifier"],
    mutationFn: ClassifierService.updateById,
    meta: {
      datsEvent: "CLASSIFIER_UPDATED",
      successMessage: (data: ClassifierRead) => `Updated classifier ${data.name}`,
    },
  });

const useDeleteClassifier = () =>
  useMutation({
    mutationKey: [...classifierQueries.all(), "deleteClassifier"],
    mutationFn: ClassifierService.deleteById,
    meta: {
      datsEvent: "CLASSIFIER_DELETED",
      successMessage: (data: ClassifierRead) => `Deleted classifier ${data.name}`,
    },
  });

const useComputeDatasetStatistics = (params: ClassifierDatasetStatisticsParams) =>
  useQuery({
    ...classifierQueries.datasetStatistics(params),
    enabled:
      params.projectId >= 0 &&
      params.model !== undefined &&
      params.baseModelName.length > 0 &&
      params.tagIds.length > 0 &&
      (params.model === ClassifierModel.DOCUMENT || params.userIds.length > 0),
    placeholderData: (previousData) => previousData,
  });

export const ClassifierHooks = {
  useLiveClassifierJob,
  useStartClassifierJob,
  useGetAllClassifiers,
  useUpdateClassifier,
  useDeleteClassifier,
  useComputeDatasetStatistics,
};
