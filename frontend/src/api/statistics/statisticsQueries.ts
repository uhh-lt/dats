import { StatisticsService } from "@api/services/StatisticsService";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for the statistics of a set of sdocs (`sdocIds` is null/undefined until the sdocs are known).
 *
 *   statisticsQueries.all()                                  ["statistics"]
 *   statisticsQueries.codeStats(codeId, sdocIds, global)     ["statistics", "code", codeId, sdocIds, global]
 *   statisticsQueries.keywordStats(projId, sdocIds, global)  ["statistics", "keyword", projId, sdocIds, global]
 *   statisticsQueries.tagStats(sdocIds, global)              ["statistics", "tag", sdocIds, global]
 */
export const statisticsQueries = {
  all: () => ["statistics"] as const,

  codeStatsScope: () => [...statisticsQueries.all(), "code"] as const,
  // prefix of all code statistics of one code, for invalidation
  codeStatsOfCodeScope: (codeId: number) => [...statisticsQueries.codeStatsScope(), codeId] as const,
  codeStats: (codeId: number, sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
    queryOptions({
      queryKey: [...statisticsQueries.codeStatsOfCodeScope(codeId), sdocIds, sortByGlobal] as const,
      queryFn: !sdocIds
        ? skipToken
        : () => StatisticsService.filterCodeStats({ codeId, requestBody: sdocIds, sortByGlobal }),
      staleTime: 1000 * 60 * 5,
    }),

  keywordStatsScope: () => [...statisticsQueries.all(), "keyword"] as const,
  keywordStats: (projectId: number, sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
    queryOptions({
      queryKey: [...statisticsQueries.keywordStatsScope(), projectId, sdocIds, sortByGlobal] as const,
      queryFn: !sdocIds
        ? skipToken
        : () => StatisticsService.filterKeywordStats({ projectId, requestBody: sdocIds, sortByGlobal }),
      staleTime: 1000 * 60 * 5,
    }),

  tagStatsScope: () => [...statisticsQueries.all(), "tag"] as const,
  tagStats: (sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
    queryOptions({
      queryKey: [...statisticsQueries.tagStatsScope(), sdocIds, sortByGlobal] as const,
      queryFn: !sdocIds ? skipToken : () => StatisticsService.filterTagStats({ requestBody: sdocIds, sortByGlobal }),
      staleTime: 1000 * 60 * 5,
    }),
};
