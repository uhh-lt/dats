import { jobQueries, useJobRefetchInterval } from "@core/job";
import { ClassifierJobRead } from "@models/ClassifierJobRead";
import { ClassifierModel } from "@models/ClassifierModel";
import { useQuery } from "@tanstack/react-query";
import { ClassifierDatasetStatisticsParams, classifierQueries } from "./classifierQueries";

// Job updates arrive via websocket (JOB_UPDATED); the completion side-effects
// (classifier list + sdoc tag invalidations) live in the JOB_UPDATED handler in
// frontend/src/plugins/websocket/websocketEventHandlers.ts.
export const useLiveClassifierJob = (
  classifierJobId: string | undefined,
  initialData: ClassifierJobRead | undefined,
) => {
  const jobRefetchInterval = useJobRefetchInterval<ClassifierJobRead>();
  return useQuery({
    ...jobQueries.classifier.byId(classifierJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

export const useGetAllClassifiers = (projectId: number) =>
  useQuery({
    ...classifierQueries.byProject(projectId),
    select: (data) => Object.values(data),
  });

export const useComputeDatasetStatistics = (params: ClassifierDatasetStatisticsParams) =>
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
