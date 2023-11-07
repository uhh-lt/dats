import { useQuery } from "@tanstack/react-query";
import {
  DocType,
  Filter,
  KeywordStat,
  MemoContentQuery,
  MemoRead,
  MemoTitleQuery,
  PaginatedMemoSearchResults,
  SearchService,
  SimSearchImageHit,
  SimSearchSentenceHit,
  SpanEntity,
  SpanEntityDocumentFrequency,
  TagStat,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import { orderFilters, SearchFilter } from "../views/search/SearchFilter";
import queryClient from "../plugins/ReactQueryClient";
import { useAppSelector } from "../plugins/ReduxHooks";
import { useAuth } from "../auth/AuthProvider";
import { useMemo } from "react";
import { useDebounce } from "../utils/useDebounce";

export abstract class SearchResults<T extends Iterable<any>> {
  constructor(protected results: T) {
    this.results = results;
  }

  getResults(): T {
    return this.results;
  }

  abstract getSearchResultSDocIds(): number[];

  abstract getNumberOfHits(): number;

  getAggregatedNumberOfHits(): number {
    return this.getNumberOfHits();
  }
}

export class LexicalSearchResults extends SearchResults<number[]> {
  getSearchResultSDocIds(): number[] {
    if (this.results.length === 0) return [];
    return this.results;
  }

  getNumberOfHits(): number {
    return this.results.length;
  }
}

export abstract class SimilaritySearchResults<
  T extends Map<number, SimSearchSentenceHit[]> | SimSearchImageHit[],
> extends SearchResults<T> {}

export class SentenceSimilaritySearchResults extends SimilaritySearchResults<Map<number, SimSearchSentenceHit[]>> {
  getSearchResultSDocIds(): number[] {
    return Array.from(this.results.keys());
  }

  getNumberOfHits(): number {
    return this.results.size;
  }

  getAggregatedNumberOfHits(): number {
    return Array.from(this.results.values()).flat().length;
  }
}

export class ImageSimilaritySearchResults extends SimilaritySearchResults<SimSearchImageHit[]> {
  getSearchResultSDocIds(): number[] {
    return this.results.map((hit) => hit.sdoc_id);
  }

  getNumberOfHits(): number {
    return this.results.length;
  }
}

export enum SearchResultsType {
  // type DOCUMENTS returns data: number[]
  DOCUMENTS,
  // type SENTENCES returns data: sdocId -> SimSearchSentenceHit[]
  SENTENCES,
}

const filterSearchQueryFn = async (
  projectId: number,
  userId: number | undefined,
  resultModalities: DocType[],
  filter: {
    keywords: string[];
    tags: number[];
    codes: SpanEntity[];
    terms: string[];
    sentences: string[];
    images: number[];
    filenames: string[];
    metadata: { key: string; value: string }[];
  },
): Promise<LexicalSearchResults> => {
  const sdocIds = await SearchService.searchSdocs({
    requestBody: {
      proj_id: projectId,
      user_ids: userId ? [userId] : undefined,
      span_entities: filter.codes.length > 0 ? filter.codes : undefined,
      tag_ids: filter.tags.length > 0 ? filter.tags : undefined,
      keywords: filter.keywords.length > 0 ? filter.keywords : undefined,
      search_terms: filter.terms.length > 0 ? filter.terms : undefined,
      filename: filter.filenames.length > 0 ? filter.filenames[0] : undefined,
      metadata: filter.metadata.length > 0 ? filter.metadata : undefined,
      doc_types: resultModalities.length > 0 ? resultModalities : undefined,
      all_tags: true,
    },
  });
  return new LexicalSearchResults(sdocIds);
};

const sentenceSimilaritySearchQueryFn = async (
  projectId: number,
  query: number | string,
): Promise<SentenceSimilaritySearchResults> => {
  const result = await SearchService.findSimilarSentences({
    requestBody: {
      proj_id: projectId,
      query: query,
      top_k: 10,
    },
  });

  // combine multiple results (sentences) per document
  const combinedSDocHits = new Map<number, SimSearchSentenceHit[]>();
  result.forEach((hit) => {
    const hits = combinedSDocHits.get(hit.sdoc_id) || [];
    hits.push(hit);
    combinedSDocHits.set(hit.sdoc_id, hits);
  });

  return new SentenceSimilaritySearchResults(combinedSDocHits);
};

const imageSimilaritySearchQueryFn = async (
  projectId: number,
  query: number | string,
): Promise<ImageSimilaritySearchResults> => {
  const results = await SearchService.findSimilarImages({
    requestBody: {
      proj_id: projectId,
      query: query,
      top_k: 10,
    },
  });

  return new ImageSimilaritySearchResults(results);
};

const useSearchDocumentsNew = (projectId: number | undefined, filter: Filter) => {
  const debouncedFilter = useDebounce(filter, 1000);
  return useQuery<LexicalSearchResults, Error>(
    [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, projectId, debouncedFilter],
    async () => {
      const sdocIds = await SearchService.searchSdocsNew({
        projectId: projectId!,
        requestBody: filter,
      });
      return new LexicalSearchResults(sdocIds);
    },
    {
      enabled: !!projectId,
    },
  );
};

const useSearchDocumentsByProjectIdAndFilters = (projectId: number, filters: SearchFilter[]) => {
  const { user } = useAuth();
  const resultModalities = useAppSelector((state) => state.search.resultModalities);
  const orderedFilters = useMemo(() => {
    return orderFilters(filters);
  }, [filters]);

  return useQuery<SearchResults<any>, Error>(
    [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, projectId, user.data?.id, filters, resultModalities],
    async () => {
      if (orderedFilters.sentences.length === 0 && orderedFilters.images.length === 0) {
        return await filterSearchQueryFn(projectId, user.data?.id, resultModalities, orderedFilters);
      } else if (
        orderedFilters.sentences.length === 1 &&
        orderedFilters.images.length === 0 &&
        resultModalities[0] === DocType.TEXT
      ) {
        return await sentenceSimilaritySearchQueryFn(projectId, orderedFilters.sentences[0]);
      } else if (
        orderedFilters.sentences.length === 1 &&
        orderedFilters.images.length === 0 &&
        resultModalities[0] === DocType.IMAGE
      ) {
        return await imageSimilaritySearchQueryFn(projectId, orderedFilters.sentences[0]);
      } else if (
        orderedFilters.sentences.length === 0 &&
        orderedFilters.images.length === 1 &&
        resultModalities[0] === DocType.TEXT
      ) {
        return await sentenceSimilaritySearchQueryFn(projectId, orderedFilters.images[0]);
      } else if (
        orderedFilters.sentences.length === 0 &&
        orderedFilters.images.length === 1 &&
        resultModalities[0] === DocType.IMAGE
      ) {
        return await imageSimilaritySearchQueryFn(projectId, orderedFilters.images[0]);
      } else {
        console.error("ERROR!");
        return new LexicalSearchResults([]);
      }
    },
  );
};

const useSearchDocumentsByProjectIdAndTagId = (projectId: number | undefined, tagId: number | undefined) =>
  useQuery<number[], Error>(
    [QueryKey.SDOCS_BY_PROJECT_AND_TAG_SEARCH, projectId, tagId],
    () => {
      return SearchService.searchSdocs({
        requestBody: {
          proj_id: projectId!,
          tag_ids: [tagId!],
          all_tags: true,
        },
      });
    },
    { enabled: !!tagId && !!projectId },
  );

const useSearchEntityDocumentStats = (projectId: number, filters: SearchFilter[], sortStatsByGlobal: boolean) => {
  const { user } = useAuth();
  const resultModalities = useAppSelector((state) => state.search.resultModalities);
  return useQuery<Map<number, SpanEntityDocumentFrequency[]>, Error>(
    [QueryKey.SEARCH_ENTITY_STATISTICS, projectId, user.data?.id, filters, resultModalities],
    async () => {
      const { keywords, tags, codes, terms, filenames, metadata } = orderFilters(filters);
      const data = await SearchService.searchCodeStats({
        requestBody: {
          proj_id: projectId,
          user_ids: user.data ? [user.data.id] : undefined,
          span_entities: codes.length > 0 ? codes : undefined,
          tag_ids: tags.length > 0 ? tags : undefined,
          keywords: keywords.length > 0 ? keywords : undefined,
          search_terms: terms.length > 0 ? terms : undefined,
          filename: filenames.length > 0 ? filenames[0] : undefined,
          metadata: metadata.length > 0 ? metadata : undefined,
          doc_types: resultModalities.length > 0 ? resultModalities : undefined,
          all_tags: true,
        },
      });
      return new Map(Object.entries(data.stats).map((x) => [parseInt(x[0]), x[1]]));
    },
  );
};

const useSearchKeywordStats = (projectId: number, filters: SearchFilter[], sortByGlobal: boolean) => {
  const { user } = useAuth();
  const resultModalities = useAppSelector((state) => state.search.resultModalities);
  return useQuery<KeywordStat[], Error>(
    [QueryKey.SEARCH_KEYWORD_STATISTICS, projectId, user.data?.id, filters, resultModalities],
    () => {
      const { keywords, tags, codes, terms, filenames, metadata } = orderFilters(filters);
      return SearchService.searchKeywordStats({
        requestBody: {
          proj_id: projectId,
          user_ids: user.data ? [user.data.id] : undefined,
          span_entities: codes.length > 0 ? codes : undefined,
          tag_ids: tags.length > 0 ? tags : undefined,
          keywords: keywords.length > 0 ? keywords : undefined,
          search_terms: terms.length > 0 ? terms : undefined,
          filename: filenames.length > 0 ? filenames[0] : undefined,
          metadata: metadata.length > 0 ? metadata : undefined,
          doc_types: resultModalities.length > 0 ? resultModalities : undefined,
          all_tags: true,
        },
        sortByGlobal: sortByGlobal,
      });
    },
  );
};

const useSearchTagStats = (projectId: number, filters: SearchFilter[], sortStatsByGlobal: boolean) => {
  const { user } = useAuth();
  const resultModalities = useAppSelector((state) => state.search.resultModalities);
  return useQuery<TagStat[], Error>(
    [QueryKey.SEARCH_TAG_STATISTICS, projectId, user.data?.id, filters, resultModalities],
    () => {
      const { keywords, tags, codes, terms, filenames, metadata } = orderFilters(filters);
      return SearchService.searchTagStats({
        requestBody: {
          proj_id: projectId,
          user_ids: user.data ? [user.data.id] : undefined,
          span_entities: codes.length > 0 ? codes : undefined,
          tag_ids: tags.length > 0 ? tags : undefined,
          keywords: keywords.length > 0 ? keywords : undefined,
          search_terms: terms.length > 0 ? terms : undefined,
          filename: filenames.length > 0 ? filenames[0] : undefined,
          metadata: metadata.length > 0 ? metadata : undefined,
          doc_types: resultModalities.length > 0 ? resultModalities : undefined,
          all_tags: true,
        },
        sortByGlobal: sortStatsByGlobal,
      });
    },
    {
      // todo: check if this really works
      onSuccess: (data) => {
        data.forEach((tagStat) => {
          queryClient.setQueryData([QueryKey.TAG, tagStat.tag.id], tagStat.tag);
        });
      },
    },
  );
};

const useSearchMemoContent = (params: MemoContentQuery) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.MEMOS_BY_CONTENT_SEARCH, params],
    async () => {
      const result = await SearchService.searchMemosByContentQuery({
        requestBody: params,
      });

      return result.memos;
    },
    {
      enabled: params.content_query.length > 0,
    },
  );

const useSearchMemoTitle = (params: MemoTitleQuery) =>
  useQuery<PaginatedMemoSearchResults, Error>(
    [QueryKey.MEMOS_BY_TITLE_SEARCH, params.title_query],
    () =>
      SearchService.searchMemosByTitleQuery({
        requestBody: params,
      }),
    {
      enabled: params.title_query.length > 0,
    },
  );

const SearchHooks = {
  useSearchEntityDocumentStats,
  useSearchKeywordStats,
  useSearchTagStats,
  useSearchMemoTitle,
  useSearchMemoContent,
  useSearchDocumentsByProjectIdAndTagId,
  useSearchDocumentsByProjectIdAndFilters,
  useSearchDocumentsNew,
};

export default SearchHooks;
