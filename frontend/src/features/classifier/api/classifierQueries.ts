import { createJobQueries } from "@core/job";
import { ClassifierService } from "@api/services/ClassifierService";
import type { ClassifierDatasetStatisticsRequest } from "@models/ClassifierDatasetStatisticsRequest";
import type { ClassifierModel } from "@models/ClassifierModel";
import type { ClassifierRead } from "@models/ClassifierRead";
import { queryOptions } from "@tanstack/react-query";

export type ClassifierMap = Record<number, ClassifierRead>;

export interface ClassifierDatasetStatisticsParams {
  projectId: number;
  model: ClassifierModel | undefined;
  classIds: number[];
  userIds: number[];
  tagIds: number[];
  mergeChildren: boolean;
  baseModelName: string;
}

/**
 * Query factory for classifiers. (The classifier background jobs are `classifierQueries.job`.)
 *
 *   classifierQueries.all()                     ["classifier"]
 *   classifierQueries.byProject(projectId)      ["classifier", "project", projectId]
 *   classifierQueries.info()                    ["classifier", "info"]
 *   classifierQueries.datasetStatistics(params) ["classifier", "datasetStatistics", ...params]
 */
export const classifierQueries = {
  all: () => ["classifier"] as const,

  // all classifiers of a project, as a map by id
  byProjectScope: () => [...classifierQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...classifierQueries.byProjectScope(), projectId] as const,
      queryFn: async () => {
        const classifiers = await ClassifierService.getByProject({ projectId });
        return classifiers.reduce<ClassifierMap>((acc, classifier) => {
          acc[classifier.id] = classifier;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),

  info: () =>
    queryOptions({
      queryKey: [...classifierQueries.all(), "info"] as const,
      queryFn: () => ClassifierService.getClassifierInfo(),
      // Classifier settings come from backend configuration and do not change at
      // runtime, so one response can be reused for the lifetime of the frontend.
      staleTime: Infinity,
    }),

  datasetStatisticsScope: () => [...classifierQueries.all(), "datasetStatistics"] as const,
  datasetStatistics: ({
    projectId,
    model,
    classIds,
    userIds,
    tagIds,
    mergeChildren,
    baseModelName,
  }: ClassifierDatasetStatisticsParams) =>
    queryOptions({
      queryKey: [
        ...classifierQueries.datasetStatisticsScope(),
        projectId,
        model,
        classIds,
        userIds,
        tagIds,
        mergeChildren,
        baseModelName,
      ] as const,
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

        return ClassifierService.computeDatasetStatistics({ projectId, requestBody: request });
      },
    }),

  // the refinement / background job of this domain
  job: createJobQueries(
    "classifier",
    (jobId) => ClassifierService.getClassifierJobById({ jobId }),
    (projectId) => ClassifierService.getClassifierJobsByProject({ projectId }),
  ),
};
