import { JobsService } from "@api/services/JobsService";
import { createJobQueries } from "@core/job";
import { ClassifiersService } from "@api/services/ClassifiersService";
import type { ClassifierDatasetStatisticsRequest } from "@models/ClassifierDatasetStatisticsRequest";
import type { ClassifierModel } from "@models/ClassifierModel";
import type { ClassifierRead } from "@models/ClassifierRead";
import { queryOptions, skipToken } from "@tanstack/react-query";

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
 *   classifierQueries.projectScope(projectId)   ["classifier", "project", projectId]
 *   classifierQueries.byProject(projectId)      ["classifier", "project", projectId]
 *   classifierQueries.info(projectId)           ["classifier", "project", projectId, "info"]
 *   classifierQueries.datasetStatistics(params) ["classifier", "project", projectId, "datasetStatistics", ...params]
 */
export const classifierQueries = {
  all: () => ["classifier"] as const,
  // prefix of all classifier queries of one project
  projectScope: (projectId: number | undefined) => [...classifierQueries.all(), "project", projectId] as const,

  // all classifiers of a project, as a map by id
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: classifierQueries.projectScope(projectId),
      queryFn: async () => {
        const classifiers = await ClassifiersService.getByProject({ projectId });
        return classifiers.reduce<ClassifierMap>((acc, classifier) => {
          acc[classifier.id] = classifier;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),

  infoScope: (projectId: number | undefined) => [...classifierQueries.projectScope(projectId), "info"] as const,
  info: (projectId: number | undefined) =>
    queryOptions({
      queryKey: classifierQueries.infoScope(projectId),
      queryFn: projectId === undefined ? skipToken : () => ClassifiersService.getInfo({ projectId }),
      // Classifier settings come from backend configuration and do not change at
      // runtime, so one response can be reused for the lifetime of the frontend.
      staleTime: Infinity,
    }),

  datasetStatisticsScope: (projectId: number) =>
    [...classifierQueries.projectScope(projectId), "datasetStatistics"] as const,
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
        ...classifierQueries.datasetStatisticsScope(projectId),
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

        return ClassifiersService.computeDatasetStatistics({ projectId, requestBody: request });
      },
    }),

  // the refinement / background job of this domain
  job: createJobQueries(
    "classifier",
    (job) => JobsService.getClassifierJobById(job),
    (projectId) => JobsService.getClassifierJobsByProject({ projectId }),
    {
      abort: (job) => JobsService.abortClassifierJob(job),
      retry: (job) => JobsService.retryClassifierJob(job),
    },
  ),
};
