import { WordFrequencyService } from "@api/services/WordFrequencyService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

/** The arguments of the word frequency search, as the backend takes them (the page is added by the query). */
type WordFrequencySearchRequest = Omit<Parameters<typeof WordFrequencyService.wordFrequencyAnalysis>[0], "page">;

/**
 * Query factory for the word frequency analysis.
 *
 *   wordFrequencyQueries.all()                 ["wordFrequency"]
 *   wordFrequencyQueries.tableInfo(projectId)  ["tableInfo", "wordFrequency", projectId]
 *   wordFrequencyQueries.search(request)       ["wordFrequency", "search", request]
 */
export const wordFrequencyQueries = {
  all: () => ["wordFrequency"] as const,

  // the column infos of the word frequency filter
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("wordFrequency", projectId),
      queryFn: async () => toColumnInfos(await WordFrequencyService.wordFrequencyAnalysisInfo({ projectId })),
      staleTime: Infinity,
    }),

  searchScope: () => [...wordFrequencyQueries.all(), "search"] as const,
  search: (request: WordFrequencySearchRequest) =>
    infiniteQueryOptions({
      queryKey: [...wordFrequencyQueries.searchScope(), request] as const,
      queryFn: ({ pageParam }) => WordFrequencyService.wordFrequencyAnalysis({ ...request, page: pageParam }),
      initialPageParam: 0,
      getNextPageParam: (_lastGroup, groups) => groups.length,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }),
};
