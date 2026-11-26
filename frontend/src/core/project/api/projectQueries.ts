import { DocprocessingService } from "@api/services/DocprocessingService";
import { FeatureService } from "@api/services/FeatureService";
import { SourceDocumentService } from "@api/services/SourceDocumentService";
import { UserService } from "@api/services/UserService";
import { FeatureStatus } from "@models/FeatureStatus";
import type { ProjectFeatureRead } from "@models/ProjectFeatureRead";
import type { SDocStatus } from "@models/SDocStatus";
import { queryOptions } from "@tanstack/react-query";

export type ProjectFeatureMap = Partial<Record<string, ProjectFeatureRead>>;

/**
 * Query factory for projects.
 *
 *   projectQueries.all()                                ["project"]
 *   projectQueries.userProjects()                       ["project", "user"]
 *   projectQueries.projectScope(projectId)              ["project", "project", projectId]
 *   projectQueries.sdocStatusCount(projectId, status)   ["project", "project", projectId, "sdocStatusCount", status]
 *   projectQueries.sdocStatusSimple(projectId, status)  ["project", "project", projectId, "sdocStatusSimple", status]
 *   projectQueries.features(projectId)                  ["project", "project", projectId, "features"]
 */
export const projectQueries = {
  all: () => ["project"] as const,

  // all projects of the logged-in user
  userProjects: () =>
    queryOptions({
      queryKey: [...projectQueries.all(), "user"] as const,
      queryFn: () => UserService.getUserProjects(),
      staleTime: 1000 * 60 * 5,
    }),

  // prefix of all queries of the data of one project
  projectScope: (projectId: number) => [...projectQueries.all(), "project", projectId] as const,

  // number of documents of a project with the given processing status
  sdocStatusCountScope: (projectId: number) => [...projectQueries.projectScope(projectId), "sdocStatusCount"] as const,
  sdocStatusCount: (projectId: number, status: SDocStatus) =>
    queryOptions({
      queryKey: [...projectQueries.sdocStatusCountScope(projectId), status] as const,
      queryFn: () => SourceDocumentService.countSdocs({ projectId, status }),
    }),

  // simple processing status of all documents of a project with the given status
  sdocStatusSimpleScope: (projectId: number) =>
    [...projectQueries.projectScope(projectId), "sdocStatusSimple"] as const,
  sdocStatusSimple: (projectId: number, status: SDocStatus) =>
    queryOptions({
      queryKey: [...projectQueries.sdocStatusSimpleScope(projectId), status] as const,
      queryFn: () => DocprocessingService.getSimpleSdocStatusByProjectAndStatus({ projectId, status }),
    }),

  // state (enabled, ready, coverage) of every toggleable feature in a project, as a map feature -> state; an
  // aggregate over all documents, so it is loaded only where it is shown. Refreshed every few seconds while a feature
  // is computing, wherever it is used (the pipeline steps send no events).
  featuresScope: (projectId: number) => [...projectQueries.projectScope(projectId), "features"] as const,
  features: (projectId: number) =>
    queryOptions({
      queryKey: projectQueries.featuresScope(projectId),
      queryFn: async () => {
        const states = await FeatureService.getProjectFeatures({ projectId });
        return states.reduce<ProjectFeatureMap>((acc, state) => {
          acc[state.feature] = state;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60,
      refetchInterval: (query) =>
        Object.values(query.state.data ?? {}).some((state) => state?.status === FeatureStatus.COMPUTING) ? 3000 : false,
    }),
};
