import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

import { useAppSelector } from "@plugins/redux";
import { KeywordStat } from "./openapi/models/KeywordStat";
import { SpanEntityStat } from "./openapi/models/SpanEntityStat";
import { TagStat } from "./openapi/models/TagStat";
import { StatisticsService } from "./openapi/services/StatisticsService";

const useFilterCodeStats = (codeId: number, sdocIds: number[] | null | undefined) => {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);

  return useQuery<SpanEntityStat[], Error>({
    queryKey: [QueryKey.FILTER_ENTITY_STATISTICS, codeId, sdocIds, sortStatsByGlobal],
    queryFn: () =>
      StatisticsService.filterCodeStats({
        codeId,
        requestBody: sdocIds!,
        sortByGlobal: sortStatsByGlobal,
      }),
    enabled: !!sdocIds,
    staleTime: 1000 * 60 * 5,
  });
};

const useFilterKeywordStats = (projectId: number, sdocIds: number[] | null | undefined) => {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);

  return useQuery<KeywordStat[], Error>({
    queryKey: [QueryKey.FILTER_KEYWORD_STATISTICS, projectId, sdocIds, sortStatsByGlobal],
    queryFn: () =>
      StatisticsService.filterKeywordStats({
        projectId,
        requestBody: sdocIds!,
        sortByGlobal: sortStatsByGlobal,
      }),
    enabled: !!sdocIds,
    staleTime: 1000 * 60 * 5,
  });
};

const useFilterTagStats = (sdocIds: number[] | null | undefined) => {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);

  return useQuery<TagStat[], Error>({
    queryKey: [QueryKey.FILTER_TAG_STATISTICS, sdocIds, sortStatsByGlobal],
    queryFn: () =>
      StatisticsService.filterTagStats({
        requestBody: sdocIds!,
        sortByGlobal: sortStatsByGlobal,
      }),
    enabled: !!sdocIds,
    staleTime: 1000 * 60 * 5,
  });
};

export const StatisticsHooks = {
  useFilterCodeStats,
  useFilterKeywordStats,
  useFilterTagStats,
};
