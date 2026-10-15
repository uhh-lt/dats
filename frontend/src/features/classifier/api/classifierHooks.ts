import { queryClient } from "@api/queryClient";
import { ClassifierService } from "@api/services/ClassifierService";
import { useJobRefetchInterval } from "@core/job";
import { ClassifierJobRead } from "@models/ClassifierJobRead";
import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierRead } from "@models/ClassifierRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClassifierDatasetStatisticsParams, classifierQueries } from "./classifierQueries";

// Job updates arrive via websocket (JOB_UPDATED); the completion side-effects
// (classifier list + sdoc tag invalidations) live in the JOB_UPDATED handler in
// frontend/src/plugins/websocket/websocketEventHandlers.ts.
const useLiveClassifierJob = (classifierJobId: string | undefined, initialData: ClassifierJobRead | undefined) => {
  const jobRefetchInterval = useJobRefetchInterval<ClassifierJobRead>();
  return useQuery({
    ...classifierQueries.job.byId(classifierJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useGetAllClassifiers = (projectId: number) =>
  useQuery({
    ...classifierQueries.byProject(projectId),
    select: (data) => Object.values(data),
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

const useStartClassifierJob = () =>
  useMutation({
    mutationKey: [...classifierQueries.all(), "startClassifierJob"],
    mutationFn: ClassifierService.startClassifierJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: classifierQueries.job.byProject(job.project_id).queryKey });
    },
    meta: {
      successMessage: (data: ClassifierJobRead) =>
        `Started Classifier Job as a new background task (ID: ${data.job_id})`,
    },
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

/**
 * Shared hook for the classifier dialog data-selection steps (training & evaluation).
 * Reads the current selection from the classifier store, resolves the base model
 * (from training settings or, in the evaluation flow, from the selected classifier),
 * and fetches the dataset statistics.
 */
function useDatasetStatistics() {
  // dialog state
  const model = useAppSelector((state) => state.classifier.context.model);
  const projectId = useAppSelector((state) => state.classifier.context.projectId);
  const classIds = useAppSelector((state) => state.classifier.dataset.classIds);
  const userIds = useAppSelector((state) => state.classifier.dataset.userIds);
  const tagIds = useAppSelector((state) => state.classifier.dataset.tagIds);
  const mergeChildren = useAppSelector((state) => state.classifier.dataset.mergeChildren);
  const classifierId = useAppSelector((state) => state.classifier.context.classifierId);
  const trainingBaseModelName = useAppSelector((state) => state.classifier.drafts.trainingSettings?.base_name);

  // in the EVALUATION flow we know the classifier, so we use its actual base model
  const classifiers = useGetAllClassifiers(projectId);
  const classifier = classifiers.data?.find((c) => c.id === classifierId);
  const baseModelName = trainingBaseModelName ?? classifier?.base_model ?? "";

  // global server state
  const datasetStats = useComputeDatasetStatistics({
    projectId,
    model,
    classIds,
    userIds,
    tagIds,
    mergeChildren,
    baseModelName,
  });

  return { model, datasetStats };
}

export const ClassifierHooks = {
  useLiveClassifierJob,
  useGetAllClassifiers,
  useComputeDatasetStatistics,
  useStartClassifierJob,
  useUpdateClassifier,
  useDeleteClassifier,
  useDatasetStatistics,
};
