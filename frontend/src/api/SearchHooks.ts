import { useQuery } from "@tanstack/react-query";
import { KeywordStat, SearchService, SpanEntityStat } from "./openapi";
import { QueryKey } from "./QueryKey";

const useSearchEntityStats = (projectId: number, sdocIds: number[] | undefined) =>
  useQuery<SpanEntityStat[], Error>(
    [QueryKey.SEARCH_ENTITY_STATISTICS, sdocIds?.sort((a, b) => a - b)],
    () =>
      SearchService.searchStatsSearchStatsPost({
        requestBody: {
          proj_id: projectId,
          sdoc_ids: sdocIds!,
        },
      }),
    {
      enabled: !!sdocIds,
    }
  );

const useSearchKeywordStats = (projectId: number, sdocIds: number[]) =>
  useQuery<KeywordStat[], Error>(
    [QueryKey.SEARCH_KEYWORD_STATISTICS, sdocIds?.sort((a, b) => a - b)],
    () =>
      SearchService.searchKeywordStatsSearchKeywordStatsPost({
        requestBody: {
          proj_id: projectId,
          sdoc_ids: sdocIds!,
        },
      }),
    {
      enabled: sdocIds.length > 0,
    }
  );

const SearchHooks = {
  useSearchEntityStats,
  useSearchKeywordStats,
};

export default SearchHooks;
