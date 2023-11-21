import { useQuery } from "@tanstack/react-query";
import { MyFilter } from "../features/FilterDialog/filterUtils";
import queryClient from "../plugins/ReactQueryClient";
import { QueryKey } from "./QueryKey";
import {
  KeywordStat,
  MemoContentQuery,
  MemoRead,
  MemoTitleQuery,
  PaginatedMemoSearchResults,
  SearchColumns,
  SearchService,
  SimSearchImageHit,
  SimSearchSentenceHit,
  SpanEntityStat,
  TagStat,
} from "./openapi";
import { useAppSelector } from "../plugins/ReduxHooks";

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

// const sentenceSimilaritySearchQueryFn = async (
//   projectId: number,
//   query: number | string
// ): Promise<SentenceSimilaritySearchResults> => {
//   const result = await SearchService.findSimilarSentences({
//     requestBody: {
//       proj_id: projectId,
//       query: query,
//       top_k: 10,
//     },
//   });

//   // combine multiple results (sentences) per document
//   const combinedSDocHits = new Map<number, SimSearchSentenceHit[]>();
//   result.forEach((hit) => {
//     const hits = combinedSDocHits.get(hit.sdoc_id) || [];
//     hits.push(hit);
//     combinedSDocHits.set(hit.sdoc_id, hits);
//   });

//   return new SentenceSimilaritySearchResults(combinedSDocHits);
// };

// const imageSimilaritySearchQueryFn = async (
//   projectId: number,
//   query: number | string
// ): Promise<ImageSimilaritySearchResults> => {
//   const results = await SearchService.findSimilarImages({
//     requestBody: {
//       proj_id: projectId,
//       query: query,
//       top_k: 10,
//     },
//   });

//   return new ImageSimilaritySearchResults(results);
// };

const useSearchDocumentsNew = (projectId: number | undefined) => {
  const filter = useAppSelector((state) => state.searchFilter.filter["root"]);
  return useQuery<LexicalSearchResults, Error>(
    [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, projectId, filter],
    async () => {
      const sdocIds = await SearchService.searchSdocsNew({
        projectId: projectId!,
        requestBody: {
          filter: filter as MyFilter<SearchColumns>,
          sorts: [],
        },
      });
      return new LexicalSearchResults(sdocIds);
    },
    {
      enabled: !!projectId,
    },
  );
};

const useSearchCodeStats = (
  codeId: number,
  userId: number | undefined,
  sdocIds: number[],
  sortStatsByGlobal: boolean,
) =>
  useQuery<SpanEntityStat[], Error>(
    [QueryKey.SEARCH_ENTITY_STATISTICS, codeId, userId, sdocIds, sortStatsByGlobal],
    () =>
      SearchService.searchCodeStats({
        codeId: codeId,
        requestBody: {
          user_ids: [userId!],
          sdoc_ids: sdocIds,
        },
        sortByGlobal: sortStatsByGlobal,
      }),
    {
      enabled: !!userId,
    },
  );

const useSearchKeywordStats = (projectId: number, sdocIds: number[], sortStatsByGlobal: boolean) =>
  useQuery<KeywordStat[], Error>([QueryKey.SEARCH_KEYWORD_STATISTICS, projectId, sdocIds, sortStatsByGlobal], () => {
    return SearchService.searchKeywordStats({
      projectId: projectId,
      requestBody: sdocIds,
      sortByGlobal: sortStatsByGlobal,
    });
  });

const useSearchTagStats = (sdocIds: number[], sortStatsByGlobal: boolean) =>
  useQuery<TagStat[], Error>([QueryKey.SEARCH_TAG_STATISTICS, sdocIds, sortStatsByGlobal], () => {
    return SearchService.searchTagStats({
      requestBody: sdocIds,
      sortByGlobal: sortStatsByGlobal,
    });
  });

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
  useSearchCodeStats,
  useSearchKeywordStats,
  useSearchTagStats,
  useSearchMemoTitle,
  useSearchMemoContent,
  useSearchDocumentsNew,
};

export default SearchHooks;
