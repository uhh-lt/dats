import { useQuery } from "@tanstack/react-query";
import { statisticsQueries } from "./statisticsQueries";

const useFilterCodeStats = (codeId: number, sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
  useQuery(statisticsQueries.codeStats(codeId, sdocIds, sortByGlobal));

const useFilterKeywordStats = (
  projectId: number,
  sdocIds: number[] | null | undefined,
  sortByGlobal: boolean | undefined,
) => useQuery(statisticsQueries.keywordStats(projectId, sdocIds, sortByGlobal));

const useFilterTagStats = (sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
  useQuery(statisticsQueries.tagStats(sdocIds, sortByGlobal));

export const StatisticsHooks = {
  useFilterCodeStats,
  useFilterKeywordStats,
  useFilterTagStats,
};
