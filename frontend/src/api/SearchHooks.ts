import { useQuery } from "@tanstack/react-query";
import {
  KeywordStat,
  MemoContentQuery,
  MemoRead,
  PaginatedMemoSearchResults,
  SearchService,
  SpanEntityStat,
} from "./openapi";
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
        limit: 1000,
      }),
    {
      enabled: !!sdocIds && sdocIds.length > 0,
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
        limit: 1000,
      }),
    {
      enabled: sdocIds.length > 0,
    }
  );

const useSearchMemoContent = (params: MemoContentQuery) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.SEARCH_MEMO_CONTENT, params.content_query],
    async () => {
      const result = await SearchService.searchMemosByContentQuerySearchLexicalMemoContentPost({
        requestBody: params,
      });

      return result.memos;
    },
    {
      enabled: params.content_query.length > 0,
    }
  );

const useSearchMemoTitle = (params: MemoContentQuery) =>
  useQuery<PaginatedMemoSearchResults, Error>(
    [QueryKey.SEARCH_MEMO_CONTENT, params.content_query],
    () =>
      SearchService.searchMemosByContentQuerySearchLexicalMemoContentPost({
        requestBody: params,
      }),
    {
      enabled: params.content_query.length > 0,
    }
  );

const SearchHooks = {
  useSearchEntityStats,
  useSearchKeywordStats,
  useSearchMemoTitle,
  useSearchMemoContent,
};

export default SearchHooks;
