import { TagService } from "@api/services/TagService";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for tags.
 *
 *   tagQueries.all()                         ["tag"]
 *   tagQueries.byProject(projectId)          ["tag", "project", projectId]
 *   tagQueries.idsBySdoc(projectId, sdocId)  ["tag", "sdoc", sdocId, projectId]
 *   tagQueries.sdocCount(projectId, sdocIds) ["tag", "sdocCount", projectId, sdocIds]
 *
 * The routes need the project, but the sdoc id already determines it: the project comes last in the idsBySdoc key, so
 * the prefix by sdoc (idsBySdocOfSdocScope) covers it.
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
  // prefix of the tag ids of one sdoc, for cache writes
  idsBySdocOfSdocScope: (sdocId: number) => [...tagQueries.idsBySdocScope(), sdocId] as const,
  idsBySdoc: (projectId: number | null | undefined, sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...tagQueries.idsBySdocScope(), sdocId, projectId] as const,
      queryFn:
        !projectId || !sdocId
          ? skipToken
          : async () => {
              const tags = await TagService.getByProject({ projectId, sdocId });
              return tags.map((tag) => tag.id);
            },
      staleTime: 1000 * 60 * 5,
    }),

  // number of documents per tag, for the given documents
  sdocCountScope: () => [...tagQueries.all(), "sdocCount"] as const,
  sdocCount: (projectId: number, sdocIds: number[]) =>
    queryOptions({
      queryKey: [...tagQueries.sdocCountScope(), projectId, sdocIds] as const,
      queryFn: async () => {
        const stringRecord = await TagService.countTags({ projectId, requestBody: { sdoc_ids: sdocIds } });
        return new Map(Object.entries(stringRecord).map(([key, val]) => [parseInt(key, 10), val]));
      },
    }),
};
