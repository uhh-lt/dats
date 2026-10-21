import { TagService } from "@api/services/TagService";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for tags.
 *
 *   tagQueries.all()                         ["tag"]
 *   tagQueries.byProject(projectId)          ["tag", "project", projectId]
 *   tagQueries.idsBySdoc(sdocId)             ["tag", "sdoc", sdocId]
 *   tagQueries.sdocCount(projectId, sdocIds) ["tag", "sdocCount", projectId, sdocIds]
 */
export const tagQueries = {
  all: () => ["tag"] as const,

  // all tags of a project
  byProjectScope: () => [...tagQueries.all(), "project"] as const,
  byProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: [...tagQueries.byProjectScope(), projectId] as const,
      queryFn: projectId === undefined ? skipToken : () => TagService.getByProject({ projectId }),
      staleTime: 1000 * 60 * 5,
    }),

  // tag ids of source documents
  idsBySdocScope: () => [...tagQueries.all(), "sdoc"] as const,
  idsBySdoc: (sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...tagQueries.idsBySdocScope(), sdocId] as const,
      queryFn: !sdocId ? skipToken : () => TagService.getBySdoc({ sdocId }),
      staleTime: 1000 * 60 * 5,
    }),

  // number of documents per tag, for the given documents
  sdocCountScope: () => [...tagQueries.all(), "sdocCount"] as const,
  sdocCount: (projectId: number, sdocIds: number[]) =>
    queryOptions({
      queryKey: [...tagQueries.sdocCountScope(), projectId, sdocIds] as const,
      queryFn: async () => {
        const stringRecord = await TagService.getSdocCounts({ projectId, requestBody: sdocIds });
        return new Map(Object.entries(stringRecord).map(([key, val]) => [parseInt(key, 10), val]));
      },
    }),
};
