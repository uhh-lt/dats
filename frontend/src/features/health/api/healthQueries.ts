import { DocprocessingService } from "@api/services/DocprocessingService";
import { DocType } from "@models/DocType";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

/** The arguments of the health search, as the backend takes them (the page is added by the query). */
type SdocHealthSearchRequest = Omit<Parameters<typeof DocprocessingService.searchSdocHealth>[0], "page">;

/**
 * Query factory for the sdoc health view.
 *
 *   healthQueries.all()                    ["health"]
 *   healthQueries.columns(doctype)         ["health", "columns", doctype]
 *   healthQueries.search(request)          ["health", "search", request]
 */
export const healthQueries = {
  all: () => ["health"] as const,

  columnsScope: () => [...healthQueries.all(), "columns"] as const,
  columns: (doctype: DocType) =>
    queryOptions({
      queryKey: [...healthQueries.columnsScope(), doctype] as const,
      queryFn: () => DocprocessingService.getSearchColumnsByDoctype({ doctype }),
      staleTime: Infinity,
    }),

  searchScope: () => [...healthQueries.all(), "search"] as const,
  search: (request: SdocHealthSearchRequest) =>
    infiniteQueryOptions({
      queryKey: [...healthQueries.searchScope(), request] as const,
      queryFn: ({ pageParam }) => DocprocessingService.searchSdocHealth({ ...request, page: pageParam }),
      initialPageParam: 0,
      getNextPageParam: (_lastGroup, groups) => groups.length,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }),
};
