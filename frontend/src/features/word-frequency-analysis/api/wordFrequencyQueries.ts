import { WordFrequencyService } from "@api/services/WordFrequencyService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import type { WordFrequencySearchRequest } from "@models/WordFrequencySearchRequest";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

/**
 * Query factory for the word frequency analysis.
 *
 *   wordFrequencyQueries.all()                    ["wordFrequency"]
 *   wordFrequencyQueries.projectScope(projectId)  ["wordFrequency", "project", projectId]
 *   wordFrequencyQueries.tableInfo(projectId)     ["tableInfo", "project", projectId, "wordFrequency"]
 *   wordFrequencyQueries.search(projectId, req)   ["wordFrequency", "project", projectId, "search", req]
 */
export const wordFrequencyQueries = {
  all: () => ["wordFrequency"] as const,
  // prefix of all word frequency queries of one project
  projectScope: (projectId: number) => [...wordFrequencyQueries.all(), "project", projectId] as const,

  // the column infos of the word frequency filter
  tableInfo: (projectId: number) =>
    queryOptions({
      queryKey: tableInfoQueries.byDomain("wordFrequency", projectId),
      queryFn: async () => toColumnInfos(await WordFrequencyService.getInfo({ projectId })),
      staleTime: Infinity,
    }),

  searchScope: (projectId: number) => [...wordFrequencyQueries.projectScope(projectId), "search"] as const,
  // the word frequencies; takes the backend request without the page, which the queryFn adds
  search: (projectId: number, request: Omit<WordFrequencySearchRequest, "page_number">) =>
    infiniteQueryOptions({
      queryKey: [...wordFrequencyQueries.searchScope(projectId), request] as const,
      queryFn: ({ pageParam }) =>
        WordFrequencyService.computeWordFrequencies({ projectId, requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (_lastGroup, groups) => groups.length,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }),
};
