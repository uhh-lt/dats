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
import { orderFilter, SearchFilter } from "../views/search/SearchFilter";

// todo: merge useSearchDocumentsByProjectIdAndFilters and useSearchDocumentsByProjectIdAndTagId
const useSearchDocumentsByProjectIdAndFilters = (projectId: number, filters: SearchFilter[]) =>
  useQuery<number[], Error>([QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, projectId, filters], () => {
    const { keywords, tags, codes, texts } = orderFilter(filters);
    return SearchService.searchSdocsSearchSdocPost({
      requestBody: {
        proj_id: projectId,
        span_entities: codes.length > 0 ? codes : undefined,
        tag_ids: tags.length > 0 ? tags : undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        search_terms: texts.length > 0 ? texts : undefined,
        all_tags: true,
      },
    });
  });

const useSearchDocumentsByProjectIdAndTagId = (projectId: number | undefined, tagId: number | undefined) =>
  useQuery<number[], Error>(
    [QueryKey.SDOCS_BY_PROJECT_AND_TAG_SEARCH, projectId, tagId],
    () => {
      return SearchService.searchSdocsSearchSdocPost({
        requestBody: {
          proj_id: projectId!,
          tag_ids: [tagId!],
          all_tags: true,
        },
      });
    },
    { enabled: !!tagId && !!projectId }
  );

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
    [QueryKey.MEMOS_BY_CONTENT_SEARCH, params.content_query],
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
    [QueryKey.MEMOS_BY_TITLE_SEARCH, params.content_query],
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
  useSearchDocumentsByProjectIdAndTagId,
  useSearchDocumentsByProjectIdAndFilters,
};

export default SearchHooks;
