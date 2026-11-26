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
 *   perspectivesQueries.all()                                         ["perspectives"]
 *   perspectivesQueries.aspectsByProject(projectId)                   ["perspectives", "aspects", projectId]
 *   perspectivesQueries.docAspect(projectId, aspectId, sdocId)                   ["perspectives", "docAspect", aspectId, sdocId, projectId]
 *   perspectivesQueries.visualization(projectId, aspectId, searchQuery, filter)  ["perspectives", "visualization", aspectId, ..., projectId]
 *   perspectivesQueries.clusterSimilarities(projectId, aspectId)                 ["perspectives", "clusterSimilarities", aspectId, projectId]
 *   perspectivesQueries.clustersBySdoc(projectId, aspectId, sdocId)              ["perspectives", "clustersBySdoc", aspectId, sdocId, projectId]
 *   perspectivesQueries.mapThumbnailUrl(projectId, aspectId)                     ["perspectives", "mapThumbnailUrl", aspectId, projectId]
 */
export const perspectivesQueries = {
  all: () => ["perspectives"] as const,

  // all aspects of a project, as a map by aspect id
  aspectsByProjectScope: () => [...perspectivesQueries.all(), "aspects"] as const,
  aspectsByProject: (projectId: number) =>
    queryOptions({
      queryKey: [...perspectivesQueries.aspectsByProjectScope(), projectId] as const,
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
  docAspectScope: () => [...perspectivesQueries.all(), "docAspect"] as const,
  docAspect: (
    projectId: number | null | undefined,
    aspectId: number | null | undefined,
    sdocId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...perspectivesQueries.docAspectScope(), aspectId, sdocId, projectId] as const,
      queryFn:
        !projectId || !aspectId || !sdocId
          ? skipToken
          : () => PerspectivesService.getDocaspectById({ projectId, aspectId, sdocId }),
      staleTime: Infinity,
    }),

  // the document visualization (2D map) of an aspect
  visualizationScope: () => [...perspectivesQueries.all(), "visualization"] as const,
  // prefix of all visualizations of one aspect (any search query / filter), for invalidation
  visualizationOfAspectScope: (aspectId: number) => [...perspectivesQueries.visualizationScope(), aspectId] as const,
  visualization: (
    projectId: number | undefined,
    aspectId: number,
    searchQuery: string,
    filter: Body_perspectives_visualize_documents["filter"],
  ) =>
    queryOptions({
      queryKey: [...perspectivesQueries.visualizationScope(), aspectId, searchQuery, filter, projectId] as const,
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

  clusterSimilaritiesScope: () => [...perspectivesQueries.all(), "clusterSimilarities"] as const,
  // prefix of the cluster similarities of one aspect, for invalidation
  clusterSimilaritiesOfAspectScope: (aspectId: number) =>
    [...perspectivesQueries.clusterSimilaritiesScope(), aspectId] as const,
  clusterSimilarities: (projectId: number | undefined, aspectId: number) =>
    queryOptions({
      queryKey: [...perspectivesQueries.clusterSimilaritiesOfAspectScope(aspectId), projectId] as const,
      queryFn:
        projectId === undefined ? skipToken : () => PerspectivesService.getClusterSimilarities({ projectId, aspectId }),
      staleTime: 1000 * 60 * 5,
    }),

  clustersBySdocScope: () => [...perspectivesQueries.all(), "clustersBySdoc"] as const,
  clustersBySdoc: (
    projectId: number | null | undefined,
    aspectId: number | null | undefined,
    sdocId: number | null | undefined,
  ) =>
    queryOptions({
      queryKey: [...perspectivesQueries.clustersBySdocScope(), aspectId, sdocId, projectId] as const,
      queryFn:
        !projectId || !aspectId || !sdocId
          ? skipToken
          : () => PerspectivesService.getClustersForSdoc({ projectId, aspectId, sdocId }),
      staleTime: 1000 * 60 * 5,
    }),

  // the relative url of the map thumbnail of an aspect, null until it is computed
  // (raw; the hook adds the /content/ prefix)
  mapThumbnailUrlScope: () => [...perspectivesQueries.all(), "mapThumbnailUrl"] as const,
  mapThumbnailUrl: (projectId: number, aspectId: number) =>
    queryOptions({
      queryKey: [...perspectivesQueries.mapThumbnailUrlScope(), aspectId, projectId] as const,
      queryFn: () => PerspectivesService.getMapThumbnailUrl({ projectId, aspectId }),
    }),

  // the refinement / background job of this domain
  job: createJobQueries("perspectives", (job) => JobService.getPerspectivesJobById(job)),
};
