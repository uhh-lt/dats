import { JobService } from "@api/services/JobService";
import { createJobQueries } from "@core/job";
import { PerspectivesService } from "@api/services/PerspectivesService";
import type { AspectRead } from "@models/AspectRead";
import type { Body_perspectives_visualize_documents } from "@models/Body_perspectives_visualize_documents";
import { queryOptions, skipToken } from "@tanstack/react-query";

export type AspectMap = Record<number, AspectRead>;

/**
 * Query factory for perspectives (aspects, their clusters and visualizations).
 * The perspectives background job is `perspectivesQueries.job`.
 *
 *   perspectivesQueries.all()                                                    ["perspectives"]
 *   perspectivesQueries.projectScope(projectId)                                  ["perspectives", "project", projectId]
 *   perspectivesQueries.aspectsByProject(projectId)                              ["perspectives", "project", projectId, "aspects"]
 *   perspectivesQueries.docAspect(projectId, aspectId, sdocId)                   ["perspectives", "project", projectId, "docAspect", aspectId, sdocId]
 *   perspectivesQueries.visualization(projectId, aspectId, searchQuery, filter)  ["perspectives", "project", projectId, "visualization", aspectId, ...]
 *   perspectivesQueries.clusterSimilarities(projectId, aspectId)                 ["perspectives", "project", projectId, "clusterSimilarities", aspectId]
 *   perspectivesQueries.clustersBySdoc(projectId, aspectId, sdocId)              ["perspectives", "project", projectId, "clustersBySdoc", aspectId, sdocId]
 *   perspectivesQueries.mapThumbnailUrl(projectId, aspectId)                     ["perspectives", "project", projectId, "mapThumbnailUrl", aspectId]
 */
export const perspectivesQueries = {
  all: () => ["perspectives"] as const,
  // prefix of all perspectives queries of one project (the jobs have their own root, `job.all()`)
  projectScope: (projectId: number | null | undefined) => [...perspectivesQueries.all(), "project", projectId] as const,

  // all aspects of a project, as a map by aspect id
  aspectsByProjectScope: (projectId: number) => [...perspectivesQueries.projectScope(projectId), "aspects"] as const,
  aspectsByProject: (projectId: number) =>
    queryOptions({
      queryKey: perspectivesQueries.aspectsByProjectScope(projectId),
      queryFn: async () => {
        const aspects = await PerspectivesService.getAllAspects({ projectId });
        return aspects.reduce<AspectMap>((acc, aspect) => {
          acc[aspect.id] = aspect;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),

  // the content of a document for an aspect
  docAspectScope: (projectId: number | null | undefined) =>
    [...perspectivesQueries.projectScope(projectId), "docAspect"] as const,
  docAspect: (
    projectId: number | null | undefined,
    aspectId: number | null | undefined,
    sdocId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...perspectivesQueries.docAspectScope(projectId), aspectId, sdocId] as const,
      queryFn:
        !projectId || !aspectId || !sdocId
          ? skipToken
          : () => PerspectivesService.getDocaspectById({ projectId, aspectId, sdocId }),
      staleTime: Infinity,
    }),

  // the document visualization (2D map) of an aspect
  visualizationScope: (projectId: number | undefined) =>
    [...perspectivesQueries.projectScope(projectId), "visualization"] as const,
  // prefix of all visualizations of one aspect (any search query / filter), for invalidation
  visualizationOfAspectScope: (projectId: number | undefined, aspectId: number) =>
    [...perspectivesQueries.visualizationScope(projectId), aspectId] as const,
  visualization: (
    projectId: number | undefined,
    aspectId: number,
    searchQuery: string,
    filter: Body_perspectives_visualize_documents["filter"],
  ) =>
    queryOptions({
      queryKey: [...perspectivesQueries.visualizationOfAspectScope(projectId, aspectId), searchQuery, filter] as const,
      queryFn:
        projectId === undefined
          ? skipToken
          : () =>
              PerspectivesService.visualizeDocuments({
                projectId,
                aspectId,
                searchQuery,
                requestBody: { filter, sorts: [] },
              }),
      staleTime: 1000 * 60 * 5,
    }),

  clusterSimilaritiesScope: (projectId: number | undefined) =>
    [...perspectivesQueries.projectScope(projectId), "clusterSimilarities"] as const,
  clusterSimilarities: (projectId: number | undefined, aspectId: number) =>
    queryOptions({
      queryKey: [...perspectivesQueries.clusterSimilaritiesScope(projectId), aspectId] as const,
      queryFn:
        projectId === undefined ? skipToken : () => PerspectivesService.getClusterSimilarities({ projectId, aspectId }),
      staleTime: 1000 * 60 * 5,
    }),

  clustersBySdocScope: (projectId: number | null | undefined) =>
    [...perspectivesQueries.projectScope(projectId), "clustersBySdoc"] as const,
  // prefix of the clusters of all sdocs in one aspect, for cache writes
  clustersBySdocOfAspectScope: (projectId: number, aspectId: number) =>
    [...perspectivesQueries.clustersBySdocScope(projectId), aspectId] as const,
  clustersBySdoc: (
    projectId: number | null | undefined,
    aspectId: number | null | undefined,
    sdocId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...perspectivesQueries.clustersBySdocScope(projectId), aspectId, sdocId] as const,
      queryFn:
        !projectId || !aspectId || !sdocId
          ? skipToken
          : () => PerspectivesService.getClustersForSdoc({ projectId, aspectId, sdocId }),
      staleTime: 1000 * 60 * 5,
    }),

  // the relative url of the map thumbnail of an aspect, null until it is computed
  // (raw; the hook adds the /content/ prefix)
  mapThumbnailUrlScope: (projectId: number) =>
    [...perspectivesQueries.projectScope(projectId), "mapThumbnailUrl"] as const,
  mapThumbnailUrl: (projectId: number, aspectId: number) =>
    queryOptions({
      queryKey: [...perspectivesQueries.mapThumbnailUrlScope(projectId), aspectId] as const,
      queryFn: () => PerspectivesService.getMapThumbnailUrl({ projectId, aspectId }),
    }),

  // the refinement / background job of this domain
  job: createJobQueries("perspectives", (job) => JobService.getPerspectivesJobById(job)),
};
