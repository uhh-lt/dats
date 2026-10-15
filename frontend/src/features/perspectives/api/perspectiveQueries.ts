import { PerspectivesService } from "@api/services/PerspectivesService";
import { SearchService } from "@api/services/SearchService";
import { type ColumnInfo, tableInfoQueries, toColumnInfos } from "@core/filter";
import type { AspectRead } from "@models/AspectRead";
import type { Body_perspectives_visualize_documents } from "@models/Body_perspectives_visualize_documents";
import { queryOptions, skipToken } from "@tanstack/react-query";

export type AspectMap = Record<number, AspectRead>;

const perspectivesJobQueries = {
  all: () => [...perspectiveQueries.all(), "job"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...perspectivesJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => PerspectivesService.getPerspectivesJob({ perspectivesJobId: jobId }),
    }),
};

/**
 * Query factory for perspectives (aspects, their clusters and visualizations).
 * The perspectives background job is `perspectiveQueries.job`.
 *
 *   perspectiveQueries.all()                                       ["perspective"]
 *   perspectiveQueries.aspectsByProject(projectId)                 ["perspective", "aspects", projectId]
 *   perspectiveQueries.docAspect(aspectId, sdocId)                 ["perspective", "docAspect", aspectId, sdocId]
 *   perspectiveQueries.visualization(aspectId, searchQuery, filter)  ["perspective", "visualization", aspectId, ...]
 *   perspectiveQueries.clusterSimilarities(aspectId)               ["perspective", "clusterSimilarities", aspectId]
 *   perspectiveQueries.clustersBySdoc(aspectId, sdocId)            ["perspective", "clustersBySdoc", aspectId, sdocId]
 */
export const perspectiveQueries = {
  all: () => ["perspective"] as const,

  // all aspects of a project, as a map by aspect id
  aspectsByProjectScope: () => [...perspectiveQueries.all(), "aspects"] as const,
  aspectsByProject: (projectId: number) =>
    queryOptions({
      queryKey: [...perspectiveQueries.aspectsByProjectScope(), projectId] as const,
      queryFn: async () => {
        const aspects = await PerspectivesService.getAllAspects({ projId: projectId });
        return aspects.reduce<AspectMap>((acc, aspect) => {
          acc[aspect.id] = aspect;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),

  // the content of a document for an aspect
  docAspectScope: () => [...perspectiveQueries.all(), "docAspect"] as const,
  docAspect: (aspectId: number | null | undefined, sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...perspectiveQueries.docAspectScope(), aspectId, sdocId] as const,
      queryFn: !aspectId || !sdocId ? skipToken : () => PerspectivesService.getDocaspectById({ aspectId, sdocId }),
      staleTime: Infinity,
    }),

  // the document visualization (2D map) of an aspect
  visualizationScope: () => [...perspectiveQueries.all(), "visualization"] as const,
  // prefix of all visualizations of one aspect (any search query / filter), for invalidation
  visualizationOfAspectScope: (aspectId: number) => [...perspectiveQueries.visualizationScope(), aspectId] as const,
  visualization: (aspectId: number, searchQuery: string, filter: Body_perspectives_visualize_documents["filter"]) =>
    queryOptions({
      queryKey: [...perspectiveQueries.visualizationScope(), aspectId, searchQuery, filter] as const,
      queryFn: () =>
        PerspectivesService.visualizeDocuments({
          aspectId,
          searchQuery,
          requestBody: { filter, sorts: [] },
        }),
      staleTime: 1000 * 60 * 5,
    }),

  // the column infos of the perspectives filter
  tableInfo: (projectId: number, onLoaded?: (columnInfos: ColumnInfo[]) => void) =>
    queryOptions({
      queryKey: tableInfoQueries.bySlice("perspectives", projectId),
      queryFn: async () => {
        const columnInfos = toColumnInfos(await SearchService.searchSdocInfo({ projectId }));
        onLoaded?.(columnInfos);
        return columnInfos;
      },
      staleTime: Infinity,
    }),

  clusterSimilaritiesScope: () => [...perspectiveQueries.all(), "clusterSimilarities"] as const,
  clusterSimilarities: (aspectId: number) =>
    queryOptions({
      queryKey: [...perspectiveQueries.clusterSimilaritiesScope(), aspectId] as const,
      queryFn: () => PerspectivesService.getClusterSimilarities({ aspectId }),
      staleTime: 1000 * 60 * 5,
    }),

  clustersBySdocScope: () => [...perspectiveQueries.all(), "clustersBySdoc"] as const,
  clustersBySdoc: (aspectId: number | null | undefined, sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...perspectiveQueries.clustersBySdocScope(), aspectId, sdocId] as const,
      queryFn: !aspectId || !sdocId ? skipToken : () => PerspectivesService.getClustersForSdoc({ aspectId, sdocId }),
      staleTime: 1000 * 60 * 5,
    }),

  // the refinement / background job of this domain
  job: perspectivesJobQueries,
};
