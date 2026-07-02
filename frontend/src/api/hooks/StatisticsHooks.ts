import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

import { KeywordStat } from "@models/KeywordStat";
import { SpanEntityStat } from "@models/SpanEntityStat";
import { TagStat } from "@models/TagStat";
import { StatisticsService } from "@api/services/StatisticsService";

const useFilterCodeStats = (codeId: number, sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
  useQuery<SpanEntityStat[], Error>({
    queryKey: [QueryKey.FILTER_ENTITY_STATISTICS, codeId, sdocIds, sortByGlobal],
    queryFn: () =>
      StatisticsService.filterCodeStats({
        codeId,
        requestBody: sdocIds!,
        sortByGlobal,
      }),
    enabled: !!sdocIds,
    staleTime: 1000 * 60 * 5,
  });

const useFilterKeywordStats = (
  projectId: number,
  sdocIds: number[] | null | undefined,
  sortByGlobal: boolean | undefined,
) =>
  useQuery<KeywordStat[], Error>({
    queryKey: [QueryKey.FILTER_KEYWORD_STATISTICS, projectId, sdocIds, sortByGlobal],
    queryFn: () =>
      StatisticsService.filterKeywordStats({
        projectId,
        requestBody: sdocIds!,
        sortByGlobal,
      }),
    enabled: !!sdocIds,
    staleTime: 1000 * 60 * 5,
  });

const useFilterTagStats = (sdocIds: number[] | null | undefined, sortByGlobal: boolean | undefined) =>
  useQuery<TagStat[], Error>({
    queryKey: [QueryKey.FILTER_TAG_STATISTICS, sdocIds, sortByGlobal],
    queryFn: () =>
      StatisticsService.filterTagStats({
        requestBody: sdocIds!,
        sortByGlobal,
      }),
    enabled: !!sdocIds,
    staleTime: 1000 * 60 * 5,
  });

export const StatisticsHooks = {
  useFilterCodeStats,
  useFilterKeywordStats,
  useFilterTagStats,
};
