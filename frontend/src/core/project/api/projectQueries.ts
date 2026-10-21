import { DocprocessingService } from "@api/services/DocprocessingService";
import { ProjectService } from "@api/services/ProjectService";
import type { SDocStatus } from "@models/SDocStatus";
import { queryOptions } from "@tanstack/react-query";

/**
 * Query factory for projects.
 *
 *   projectQueries.all()                                ["project"]
 *   projectQueries.userProjects()                       ["project", "user"]
 *   projectQueries.sdocStatusCount(projectId, status)   ["project", "sdocStatusCount", projectId, status]
 *   projectQueries.sdocStatusSimple(projectId, status)  ["project", "sdocStatusSimple", projectId, status]
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
};
