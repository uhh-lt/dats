import { QueryKey } from "@api/hooks/QueryKey";
import { useJobRefetchInterval } from "@api/hooks/jobPolling";
import { queryClient } from "@api/queryClient";
import { ClassifierService } from "@api/services/ClassifierService";
import { ClassifierDatasetStatisticsRequest } from "@models/ClassifierDatasetStatisticsRequest";
import { ClassifierInfo } from "@models/ClassifierInfo";
import { ClassifierJobRead } from "@models/ClassifierJobRead";
import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierRead } from "@models/ClassifierRead";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

export type ClassifierMap = Record<number, ClassifierRead>;

export const projectClassifiersQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_CLASSIFIERS, projectId],
    queryFn: async () => {
      const classifiers = await ClassifierService.getByProject({
        projId: projectId,
      });

      return classifiers.reduce((acc, classifier) => {
        acc[classifier.id] = classifier;
        return acc;
      }, {} as ClassifierMap);
    },
    staleTime: 1000 * 60 * 5,
  });

export const projectClassifierJobsQueryOptions = (projectId: number) =>
  queryOptions<ClassifierJobRead[]>({
    queryKey: [QueryKey.PROJECT_CLASSIFIER_JOBS, projectId],
    queryFn: () =>
      ClassifierService.getClassifierJobsByProject({
        projectId,
      }),
  });

export const classifierInfoQueryOptions = () =>
  queryOptions<ClassifierInfo>({
    queryKey: [QueryKey.CLASSIFIER_INFO],
    queryFn: () => ClassifierService.getClassifierInfo(),
    // Classifier settings come from backend configuration and do not change at
    // runtime, so one response can be reused for the lifetime of the frontend.
    staleTime: Infinity,
  });

const useGetClassifierInfo = () => useQuery(classifierInfoQueryOptions());

const useStartClassifierJob = () =>
  useMutation({
    mutationFn: ClassifierService.startClassifierJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CLASSIFIER_JOBS, job.project_id] });
    },
    meta: {
      successMessage: (data: ClassifierJobRead) =>
        `Started Classifier Job as a new background task (ID: ${data.job_id})`,
    },
  });

// Job updates arrive via websocket (JOB_UPDATED); the completion side-effects
// (classifier list + sdoc tag invalidations) live in the JOB_UPDATED handler in
// frontend/src/plugins/websocket/websocketEventHandlers.ts.
const usePollClassifierJob = (classifierJobId: string | undefined, initialData: ClassifierJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<ClassifierJobRead>();
  return useQuery<ClassifierJobRead, Error>({
    queryKey: [QueryKey.CLASSIFIER_JOB, classifierJobId],
    queryFn: () =>
      ClassifierService.getClassifierJobById({
        jobId: classifierJobId!,
      }),
    enabled: !!classifierJobId,
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useGetAllClassifiers = (projectId: number) =>
  useQuery({
    ...projectClassifiersQueryOptions(projectId),
    select: (data) => Object.values(data),
  });

const useUpdateClassifier = () =>
  useMutation({
    mutationFn: ClassifierService.updateById,
    meta: {
      datsEvent: "CLASSIFIER_UPDATED",
      successMessage: (data: ClassifierRead) => `Updated classifier ${data.name}`,
    },
  });

const useDeleteClassifier = () =>
  useMutation({
    mutationFn: ClassifierService.deleteById,
    meta: {
      datsEvent: "CLASSIFIER_DELETED",
      successMessage: (data: ClassifierRead) => `Deleted classifier ${data.name}`,
    },
  });

interface DatasetStatisticsParams {
  projectId: number;
  model: ClassifierModel | undefined;
  classIds: number[];
  userIds: number[];
  tagIds: number[];
  mergeChildren: boolean;
  baseModelName: string;
}

const useComputeDatasetStatistics = ({
  projectId,
  model,
  classIds,
  userIds,
  tagIds,
  mergeChildren,
  baseModelName,
}: DatasetStatisticsParams) =>
  useQuery({
    queryKey: [
      QueryKey.CLASSIFIER_DATASET_STATISTICS,
      projectId,
      model,
      classIds,
      userIds,
      tagIds,
      mergeChildren,
      baseModelName,
    ],
    queryFn: () => {
      if (model === undefined) {
        throw new Error("Cannot compute dataset statistics without a classifier model.");
      }

      const request: ClassifierDatasetStatisticsRequest = {
        model,
        base_model_name: baseModelName,
        tag_ids: tagIds,
        user_ids: userIds,
        class_ids: classIds,
        merge_children_into_parent: mergeChildren,
      };

      return ClassifierService.computeDatasetStatistics({
        projId: projectId,
        requestBody: request,
      });
    },
    enabled:
      projectId >= 0 &&
      model !== undefined &&
      baseModelName.length > 0 &&
      tagIds.length > 0 &&
      (model === ClassifierModel.DOCUMENT || userIds.length > 0),
    placeholderData: (previousData) => previousData,
  });

export const ClassifierHooks = {
  usePollClassifierJob,
  useStartClassifierJob,
  useGetAllClassifiers,
  useUpdateClassifier,
  useDeleteClassifier,
  useComputeDatasetStatistics,
  useGetClassifierInfo,
};
