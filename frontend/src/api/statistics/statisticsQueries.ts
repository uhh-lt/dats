import { KeywordStatisticsService } from "@api/services/KeywordStatisticsService";
import { StatisticsService } from "@api/services/StatisticsService";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for the statistics of a set of sdocs (`sdocIds` is null/undefined until the sdocs are known).
 *
 *   statisticsQueries.all()                                       ["statistics"]
 *   statisticsQueries.projectScope(projId)                        ["statistics", "project", projId]
 *   statisticsQueries.codeStats(projId, codeId, sdocIds, global)  ["statistics", "project", projId, "code", codeId, sdocIds, global]
 *   statisticsQueries.keywordStats(projId, sdocIds, global)       ["statistics", "project", projId, "keyword", sdocIds, global]
 *   statisticsQueries.tagStats(projId, sdocIds, global)           ["statistics", "project", projId, "tag", sdocIds, global]
 */
export const statisticsQueries = {
  all: () => ["statistics"] as const,
  // prefix of all statistics of one project
  projectScope: (projectId: number | undefined) => [...statisticsQueries.all(), "project", projectId] as const,

  codeStatsScope: (projectId: number | undefined) => [...statisticsQueries.projectScope(projectId), "code"] as const,
  // prefix of all code statistics of one code, for invalidation
  codeStatsOfCodeScope: (projectId: number | undefined, codeId: number) =>
    [...statisticsQueries.codeStatsScope(projectId), codeId] as const,
  codeStats: (
    projectId: number | undefined,
    codeId: number,
    sdocIds: number[] | null | undefined,
    sortByGlobal: boolean | undefined,
  ) =>
    queryOptions({
      queryKey: [...statisticsQueries.codeStatsOfCodeScope(projectId, codeId), sdocIds, sortByGlobal] as const,
      queryFn:
        !projectId || !sdocIds
          ? skipToken
          : () => StatisticsService.filterCodeStats({ projectId, codeId, requestBody: sdocIds, sortByGlobal }),
      staleTime: 1000 * 60 * 5,
    }),

  keywordStatsScope: (projectId: number) => [...statisticsQueries.projectScope(projectId), "keyword"] as const,
  keywordStats: (projectId: number, sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
    queryOptions({
      queryKey: [...statisticsQueries.keywordStatsScope(projectId), sdocIds, sortByGlobal] as const,
      queryFn: !sdocIds
        ? skipToken
        : () => KeywordStatisticsService.filterKeywordStats({ projectId, requestBody: sdocIds, sortByGlobal }),
      staleTime: 1000 * 60 * 5,
    }),

  tagStatsScope: (projectId: number) => [...statisticsQueries.projectScope(projectId), "tag"] as const,
  tagStats: (projectId: number, sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
    queryOptions({
      queryKey: [...statisticsQueries.tagStatsScope(projectId), sdocIds, sortByGlobal] as const,
      queryFn: !sdocIds
        ? skipToken
        : () => StatisticsService.filterTagStats({ projectId, requestBody: sdocIds, sortByGlobal }),
      staleTime: 1000 * 60 * 5,
    }),
};
