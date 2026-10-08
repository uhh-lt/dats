import { StatisticsService } from "@api/services/StatisticsService";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for the statistics of a set of sdocs (`sdocIds` is null/undefined until the sdocs are known).
 *
 *   statisticsQueries.all()                                ["statistics"]
 *   statisticsQueries.codeStatsByCode(codeId)              ["statistics", "code", codeId]
 *   statisticsQueries.codeStats(codeId, sdocIds, global)   ["statistics", "code", codeId, sdocIds, global]
 *   statisticsQueries.keywordStats(projId, sdocIds, global)["statistics", "keyword", projId, sdocIds, global]
 *   statisticsQueries.tagStats(sdocIds, global)            ["statistics", "tag", sdocIds, global]
 */
export const statisticsQueries = {
  all: () => ["statistics"] as const,

  codeScope: () => [...statisticsQueries.all(), "code"] as const,
  // prefix of all code statistics of one code, for invalidation
  codeStatsByCode: (codeId: number) => [...statisticsQueries.codeScope(), codeId] as const,
  codeStats: (codeId: number, sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
    queryOptions({
      queryKey: [...statisticsQueries.codeStatsByCode(codeId), sdocIds, sortByGlobal] as const,
      queryFn: !sdocIds
        ? skipToken
        : () => StatisticsService.filterCodeStats({ codeId, requestBody: sdocIds, sortByGlobal }),
      staleTime: 1000 * 60 * 5,
    }),

  keywordScope: () => [...statisticsQueries.all(), "keyword"] as const,
  keywordStats: (projectId: number, sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
    queryOptions({
      queryKey: [...statisticsQueries.keywordScope(), projectId, sdocIds, sortByGlobal] as const,
      queryFn: !sdocIds
        ? skipToken
        : () => StatisticsService.filterKeywordStats({ projectId, requestBody: sdocIds, sortByGlobal }),
      staleTime: 1000 * 60 * 5,
    }),

  tagScope: () => [...statisticsQueries.all(), "tag"] as const,
  tagStats: (sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
    queryOptions({
      queryKey: [...statisticsQueries.tagScope(), sdocIds, sortByGlobal] as const,
      queryFn: !sdocIds ? skipToken : () => StatisticsService.filterTagStats({ requestBody: sdocIds, sortByGlobal }),
      staleTime: 1000 * 60 * 5,
    }),
};
