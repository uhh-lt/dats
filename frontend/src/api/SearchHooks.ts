import { useQuery } from "@tanstack/react-query";
import {
  KeywordStat,
  MemoContentQuery,
  MemoRead,
  PaginatedMemoSearchResults,
  SearchService,
  SimSearchSentenceHit,
  SpanEntityDocumentFrequency,
  SpanEntityFrequency,
  TagStat,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import { orderFilter, SearchFilter } from "../views/search/SearchFilter";
import queryClient from "../plugins/ReactQueryClient";
import { useAppSelector } from "../plugins/ReduxHooks";

export enum SearchResultsType {
  // type DOCUMENTS returns data: number[]
  DOCUMENTS,
  // type SENTENCES returns data: SimSearchSentenceHit[]
  SENTENCES,
}

export interface SearchResults {
  // number[]: sdocIds
  // Map: sdocId -> SimSearchSentenceHit[]
  data: number[] | Map<number, SimSearchSentenceHit[]>;
  type: SearchResultsType;
}

export function getSearchResultIds(results: SearchResults) {
  switch (results.type) {
    case SearchResultsType.DOCUMENTS:
      return results.data as number[];
    case SearchResultsType.SENTENCES:
      return Array.from((results.data as Map<number, SimSearchSentenceHit[]>).keys());
    default:
      return [];
  }
}

// TODO: merge useSearchDocumentsByProjectIdAndFilters and useSearchDocumentsByProjectIdAndTagId
const useSearchDocumentsByProjectIdAndFilters = (projectId: number, filters: SearchFilter[]) => {
  const findTextModality = useAppSelector((state) => state.search.findTextModality);
  // const findImageModality = useAppSelector((state) => state.search.findImageModality);
  return useQuery<SearchResults, Error>(
    [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, projectId, filters, findTextModality],
    async () => {
      const { keywords, tags, codes, texts, sentences, files } = orderFilter(filters);
      if (sentences.length === 1) {
        if (findTextModality) {
          const result = await SearchService.findSimilarSentencesSearchSimsearchSentencesPost({
            projId: projectId,
            query: filters[0].data as string,
            topK: 10,
          });

          // combine multiple results (sentences) per document
          const x = new Map<number, SimSearchSentenceHit[]>();
          result.forEach((hit) => {
            const hits = x.get(hit.sdoc_id) || [];
            hits.push(hit);
            x.set(hit.sdoc_id, hits);
          });

          return {
            data: x,
            type: SearchResultsType.SENTENCES,
          };
        } else {
          // todo: please only return number[]
          const imageSdocs = await SearchService.findSimilarImagesSearchSimsearchImagesPost({
            projId: projectId,
            query: filters[0].data as string,
            topK: 10,
          });
          return { data: imageSdocs.map((img) => img.id), type: SearchResultsType.DOCUMENTS };
        }
      } else if (sentences.length === 0) {
        const sdocIds = await SearchService.searchSdocsSearchSdocPost({
          requestBody: {
            proj_id: projectId,
            span_entities: codes.length > 0 ? codes : undefined,
            tag_ids: tags.length > 0 ? tags : undefined,
            keywords: keywords.length > 0 ? keywords : undefined,
            search_terms: texts.length > 0 ? texts : undefined,
            file_name: files.length > 0 ? files[0] : undefined,
            all_tags: true,
          },
        });
        return { data: sdocIds, type: SearchResultsType.DOCUMENTS };
      } else {
        console.error("ERROR!");
        return { data: [], type: SearchResultsType.DOCUMENTS };
      }
    }
  );
};

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

const useSearchEntityStats = (projectId: number, filters: SearchFilter[]) =>
  useQuery<SpanEntityFrequency[], Error>([QueryKey.SEARCH_ENTITY_STATISTICS, projectId, filters], () => {
    const { keywords, tags, codes, texts } = orderFilter(filters);
    return SearchService.searchSpanEntityStatsSearchEntityStatsPost({
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

const useSearchEntityDocumentStats = (projectId: number, filters: SearchFilter[]) =>
  useQuery<Map<number, SpanEntityDocumentFrequency[]>, Error>(
    [QueryKey.SEARCH_ENTITY_STATISTICS, projectId, filters],
    async () => {
      const { keywords, tags, codes, texts } = orderFilter(filters);
      const data = await SearchService.searchEntityDocumentStatsSearchEntityDocumentStatsPost({
        requestBody: {
          proj_id: projectId,
          span_entities: codes.length > 0 ? codes : undefined,
          tag_ids: tags.length > 0 ? tags : undefined,
          keywords: keywords.length > 0 ? keywords : undefined,
          search_terms: texts.length > 0 ? texts : undefined,
          all_tags: true,
        },
      });
      return new Map(Object.entries(data.stats).map((x) => [parseInt(x[0]), x[1]]));
    }
  );

const useSearchKeywordStats = (projectId: number, filters: SearchFilter[]) =>
  useQuery<KeywordStat[], Error>([QueryKey.SEARCH_KEYWORD_STATISTICS, projectId, filters], () => {
    const { keywords, tags, codes, texts } = orderFilter(filters);
    return SearchService.searchKeywordStatsSearchKeywordStatsPost({
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

const useSearchTagStats = (projectId: number, filters: SearchFilter[]) =>
  useQuery<TagStat[], Error>(
    [QueryKey.SEARCH_TAG_STATISTICS, projectId, filters],
    () => {
      const { keywords, tags, codes, texts } = orderFilter(filters);
      return SearchService.searchTagStatsSearchTagStatsPost({
        requestBody: {
          proj_id: projectId,
          span_entities: codes.length > 0 ? codes : undefined,
          tag_ids: tags.length > 0 ? tags : undefined,
          keywords: keywords.length > 0 ? keywords : undefined,
          search_terms: texts.length > 0 ? texts : undefined,
          all_tags: true,
        },
      });
    },
    {
      // todo: check if this really works
      onSuccess: (data) => {
        data.forEach((tagStat) => {
          queryClient.setQueryData([QueryKey.TAG, tagStat.tag.id], tagStat.tag);
        });
      },
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

const useSentenceSimilaritySearch = (projectId: number, filters: SearchFilter[]) =>
  useQuery<SearchResults, Error>(
    [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, projectId, filters],
    async () => {
      const result = await SearchService.findSimilarSentencesSearchSimsearchSentencesPost({
        projId: projectId,
        query: filters[0].data as string,
        topK: 10,
      });
      return {
        sdocIds: result.map((hit) => hit.sdoc_id),
        data: result.map((hit) => hit.sentence_span.id),
        type: SearchResultsType.SENTENCES,
      };
    },
    {
      enabled: filters.length > 0,
    }
  );

const SearchHooks = {
  useSearchEntityStats,
  useSearchEntityDocumentStats,
  useSearchKeywordStats,
  useSearchTagStats,
  useSearchMemoTitle,
  useSearchMemoContent,
  useSearchDocumentsByProjectIdAndTagId,
  useSearchDocumentsByProjectIdAndFilters,
  useSentenceSimilaritySearch,
};

export default SearchHooks;
