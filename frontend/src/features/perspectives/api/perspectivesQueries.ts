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
 *   perspectivesQueries.docAspect(aspectId, sdocId)                   ["perspectives", "docAspect", aspectId, sdocId]
 *   perspectivesQueries.visualization(aspectId, searchQuery, filter)  ["perspectives", "visualization", aspectId, ...]
 *   perspectivesQueries.clusterSimilarities(aspectId)                 ["perspectives", "clusterSimilarities", aspectId]
 *   perspectivesQueries.clustersBySdoc(aspectId, sdocId)              ["perspectives", "clustersBySdoc", aspectId, sdocId]
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
  docAspect: (aspectId: number | null | undefined, sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...perspectivesQueries.docAspectScope(), aspectId, sdocId] as const,
      queryFn: !aspectId || !sdocId ? skipToken : () => PerspectivesService.getDocaspectById({ aspectId, sdocId }),
      staleTime: Infinity,
    }),

  // the document visualization (2D map) of an aspect
  visualizationScope: () => [...perspectivesQueries.all(), "visualization"] as const,
  // prefix of all visualizations of one aspect (any search query / filter), for invalidation
  visualizationOfAspectScope: (aspectId: number) => [...perspectivesQueries.visualizationScope(), aspectId] as const,
  visualization: (aspectId: number, searchQuery: string, filter: Body_perspectives_visualize_documents["filter"]) =>
    queryOptions({
      queryKey: [...perspectivesQueries.visualizationScope(), aspectId, searchQuery, filter] as const,
      queryFn: () =>
        PerspectivesService.visualizeDocuments({
          aspectId,
          searchQuery,
          requestBody: { filter, sorts: [] },
        }),
      staleTime: 1000 * 60 * 5,
    }),

  clusterSimilaritiesScope: () => [...perspectivesQueries.all(), "clusterSimilarities"] as const,
  clusterSimilarities: (aspectId: number) =>
    queryOptions({
      queryKey: [...perspectivesQueries.clusterSimilaritiesScope(), aspectId] as const,
      queryFn: () => PerspectivesService.getClusterSimilarities({ aspectId }),
      staleTime: 1000 * 60 * 5,
    }),

  clustersBySdocScope: () => [...perspectivesQueries.all(), "clustersBySdoc"] as const,
  clustersBySdoc: (aspectId: number | null | undefined, sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...perspectivesQueries.clustersBySdocScope(), aspectId, sdocId] as const,
      queryFn: !aspectId || !sdocId ? skipToken : () => PerspectivesService.getClustersForSdoc({ aspectId, sdocId }),
      staleTime: 1000 * 60 * 5,
    }),

  // the refinement / background job of this domain
  job: createJobQueries("perspectives", (jobId) =>
    PerspectivesService.getPerspectivesJob({ perspectivesJobId: jobId }),
  ),
};
