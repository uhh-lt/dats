import { DocProcessingService } from "@api/services/DocProcessingService";
import { DocType } from "@models/DocType";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

/** The arguments of the health search, as the backend takes them (the page is added by the query). */
type SdocHealthSearchRequest = Omit<Parameters<typeof DocProcessingService.searchStatuses>[0], "page">;

/**
 * Query factory for the sdoc health view.
 *
 *   healthQueries.all()                        ["health"]
 *   healthQueries.projectScope(projectId)      ["health", "project", projectId]
 *   healthQueries.columns(projectId, doctype)  ["health", "project", projectId, "columns", doctype]
 *   healthQueries.search(request)              ["health", "project", projectId, "search", request]
 */
export const healthQueries = {
  all: () => ["health"] as const,
  // prefix of all health queries of one project
  projectScope: (projectId: number) => [...healthQueries.all(), "project", projectId] as const,

  columnsScope: (projectId: number) => [...healthQueries.projectScope(projectId), "columns"] as const,
  columns: (projectId: number, doctype: DocType) =>
    queryOptions({
      queryKey: [...healthQueries.columnsScope(projectId), doctype] as const,
      queryFn: () => DocProcessingService.getColumns({ projectId, doctype }),
      staleTime: Infinity,
    }),

  searchScope: (projectId: number) => [...healthQueries.projectScope(projectId), "search"] as const,
  search: (request: SdocHealthSearchRequest) =>
    infiniteQueryOptions({
      queryKey: [...healthQueries.searchScope(request.projectId), request] as const,
      queryFn: ({ pageParam }) => DocProcessingService.searchStatuses({ ...request, page: pageParam }),
      initialPageParam: 0,
      getNextPageParam: (_lastGroup, groups) => groups.length,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }),
};
