import { DocprocessingService } from "@api/services/DocprocessingService";
import { FeatureService } from "@api/services/FeatureService";
import { ProjectService } from "@api/services/ProjectService";
import type { Feature } from "@models/Feature";
import { FeatureStatus } from "@models/FeatureStatus";
import type { ProjectFeatureRead } from "@models/ProjectFeatureRead";
import type { SDocStatus } from "@models/SDocStatus";
import { queryOptions } from "@tanstack/react-query";

export type ProjectFeatureMap = Partial<Record<Feature, ProjectFeatureRead>>;

/**
 * Query factory for projects.
 *
 *   projectQueries.all()                                ["project"]
 *   projectQueries.userProjects()                       ["project", "user"]
 *   projectQueries.sdocStatusCount(projectId, status)   ["project", "sdocStatusCount", projectId, status]
 *   projectQueries.sdocStatusSimple(projectId, status)  ["project", "sdocStatusSimple", projectId, status]
 *   projectQueries.features(projectId)                  ["project", "features", projectId]
 */
export const projectQueries = {
  all: () => ["project"] as const,

  // all projects of the logged-in user
  userProjects: () =>
    queryOptions({
      queryKey: [...projectQueries.all(), "user"] as const,
      queryFn: () => ProjectService.getUserProjects(),
      staleTime: 1000 * 60 * 5,
    }),

  // number of documents of a project with the given processing status
  sdocStatusCountScope: () => [...projectQueries.all(), "sdocStatusCount"] as const,
  sdocStatusCount: (projectId: number, status: SDocStatus) =>
    queryOptions({
      queryKey: [...projectQueries.sdocStatusCountScope(), projectId, status] as const,
      queryFn: () => ProjectService.countSdocsWithStatus({ projectId, status }),
    }),

  // simple processing status of all documents of a project with the given status
  sdocStatusSimpleScope: () => [...projectQueries.all(), "sdocStatusSimple"] as const,
  sdocStatusSimple: (projectId: number, status: SDocStatus) =>
    queryOptions({
      queryKey: [...projectQueries.sdocStatusSimpleScope(), projectId, status] as const,
      queryFn: () => DocprocessingService.getSimpleSdocStatusByProjectAndStatus({ projectId, status }),
    }),

  // state (enabled, ready, coverage) of every toggleable feature in a project, as a map feature -> state; an
  // aggregate over all documents, so it is loaded only where it is shown. Refreshed every few seconds while a feature
  // is computing, wherever it is used (the pipeline steps send no events).
  featuresScope: () => [...projectQueries.all(), "features"] as const,
  features: (projectId: number) =>
    queryOptions({
      queryKey: [...projectQueries.featuresScope(), projectId] as const,
      queryFn: async () => {
        const states = await FeatureService.getProjectFeatures({ projectId });
        return states.reduce<ProjectFeatureMap>((acc, state) => {
          acc[state.feature] = state;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60,
      refetchInterval: (query) =>
        Object.values(query.state.data ?? {}).some((state) => state.status === FeatureStatus.COMPUTING) ? 3000 : false,
    }),
};
