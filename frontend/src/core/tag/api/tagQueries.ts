import { TagService } from "@api/services/TagService";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for tags.
 *
 *   tagQueries.all()                         ["tag"]
 *   tagQueries.projectScope(projectId)       ["tag", "project", projectId]
 *   tagQueries.byProject(projectId)          ["tag", "project", projectId]
 *   tagQueries.idsBySdoc(projectId, sdocId)  ["tag", "project", projectId, "sdoc", sdocId]
 *   tagQueries.sdocCount(projectId, sdocIds) ["tag", "project", projectId, "sdocCount", sdocIds]
 */
export const tagQueries = {
  all: () => ["tag"] as const,
  // prefix of all tag queries of one project
  projectScope: (projectId: number | null | undefined) => [...tagQueries.all(), "project", projectId] as const,

  // all tags of a project
  byProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: tagQueries.projectScope(projectId),
      queryFn: projectId === undefined ? skipToken : () => TagService.getByProject({ projectId }),
      staleTime: 1000 * 60 * 5,
    }),

  // tag ids of source documents
  idsBySdocScope: (projectId: number | null | undefined) => [...tagQueries.projectScope(projectId), "sdoc"] as const,
  idsBySdoc: (projectId: number | null | undefined, sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...tagQueries.idsBySdocScope(projectId), sdocId] as const,
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
  sdocCountScope: (projectId: number) => [...tagQueries.projectScope(projectId), "sdocCount"] as const,
  sdocCount: (projectId: number, sdocIds: number[]) =>
    queryOptions({
      queryKey: [...tagQueries.sdocCountScope(projectId), sdocIds] as const,
      queryFn: async () => {
        const stringRecord = await TagService.countTags({ projectId, requestBody: { sdoc_ids: sdocIds } });
        return new Map(Object.entries(stringRecord).map(([key, val]) => [parseInt(key, 10), val]));
      },
    }),
};
