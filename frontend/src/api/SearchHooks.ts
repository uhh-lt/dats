import { useQuery } from "@tanstack/react-query";
import { MyFilter } from "../features/FilterDialog/filterUtils";
import { useAppSelector } from "../plugins/ReduxHooks";
import { QueryKey } from "./QueryKey";
import {
  KeywordStat,
  MemoContentQuery,
  MemoRead,
  SearchColumns,
  SearchService,
  SimSearchImageHit,
  SimSearchSentenceHit,
  SortDirection,
  SpanEntityStat,
  TagStat,
} from "./openapi";
import { GridSortModel } from "@mui/x-data-grid";
import { QueryType } from "../views/search/QueryType";

export abstract class SearchResults<T extends Iterable<any>> {
  constructor(protected results: T) {
    this.results = results;
  }

  getResults(): T {
    return this.results;
  }

  abstract getSearchResultSDocIds(): number[];

  abstract getNumberOfHits(): number;
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

const sentenceSimilaritySearchQueryFn =
  (projectId: number, query: number | string, filter: MyFilter<SearchColumns>) =>
  async (): Promise<SentenceSimilaritySearchResults> => {
    const result = await SearchService.findSimilarSentences({
      requestBody: {
        proj_id: projectId,
        query,
        filter,
        threshold: 0.5,
        top_k: 100,
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

const imageSimilaritySearchQueryFn =
  (projectId: number, query: number | string, filter: MyFilter<SearchColumns>) =>
  async (): Promise<ImageSimilaritySearchResults> => {
    const results = await SearchService.findSimilarImages({
      requestBody: {
        proj_id: projectId,
        query,
        filter,
        threshold: 0.5,
        top_k: 100,
      },
    });

    return new ImageSimilaritySearchResults(results);
  };

const lexicalSearchQueryFn = (
  projectId: number,
  searchQuery: string,
  expertMode: boolean,
  filter: MyFilter<SearchColumns>,
  sortModel: GridSortModel,
) => {
  return async () => {
    const sdocIds = await SearchService.searchSdocs({
      projectId: projectId!,
      searchQuery,
      expertMode,
      requestBody: {
        filter: filter as MyFilter<SearchColumns>,
        sorts: sortModel
          .filter((sort) => sort.sort)
          .map((sort) => ({ column: sort.field as SearchColumns, direction: sort.sort as SortDirection })),
      },
    });
    return new LexicalSearchResults(sdocIds);
  };
};

const useSearchDocumentsNew = (projectId: number) => {
  const filter = useAppSelector((state) => state.searchFilter.filter["root"]);
  const sortModel = useAppSelector((state) => state.search.sortModel);
  const searchQuery = useAppSelector((state) => state.search.searchQuery);
  const expertMode = useAppSelector((state) => state.search.expertMode);
  const searchType = useAppSelector((state) => state.search.searchType);

  let searchFn: () => Promise<LexicalSearchResults | ImageSimilaritySearchResults | SentenceSimilaritySearchResults>;
  switch (searchType) {
    case QueryType.LEXICAL:
      searchFn = lexicalSearchQueryFn(
        projectId,
        searchQuery.toString(),
        expertMode,
        filter as MyFilter<SearchColumns>,
        sortModel,
      );
      break;
    case QueryType.SEMANTIC_IMAGES:
      searchFn = imageSimilaritySearchQueryFn(projectId, searchQuery, filter as MyFilter<SearchColumns>);
      break;
    case QueryType.SEMANTIC_SENTENCES:
      searchFn = sentenceSimilaritySearchQueryFn(projectId, searchQuery, filter as MyFilter<SearchColumns>);
      break;
  }

  return useQuery<LexicalSearchResults | ImageSimilaritySearchResults | SentenceSimilaritySearchResults, Error>(
    [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, projectId, filter, sortModel, searchQuery, searchType],
    searchFn,
    {
      enabled: !!projectId,
      keepPreviousData: true,
    },
  );
};

const useSearchCodeStats = (codeId: number, sdocIds: number[], sortStatsByGlobal: boolean, enabled: boolean) =>
  useQuery<SpanEntityStat[], Error>(
    [QueryKey.SEARCH_ENTITY_STATISTICS, codeId, Array.from(sdocIds).sort(), sortStatsByGlobal],
    () =>
      SearchService.searchCodeStats({
        codeId: codeId,
        requestBody: sdocIds,

        sortByGlobal: sortStatsByGlobal,
      }),
    {
      enabled,
    },
  );

const useSearchKeywordStats = (projectId: number, sdocIds: number[], sortStatsByGlobal: boolean) =>
  useQuery<KeywordStat[], Error>(
    [QueryKey.SEARCH_KEYWORD_STATISTICS, projectId, Array.from(sdocIds).sort(), sortStatsByGlobal],
    () => {
      return SearchService.searchKeywordStats({
        projectId: projectId,
        requestBody: sdocIds,
        sortByGlobal: sortStatsByGlobal,
      });
    },
  );

const useSearchTagStats = (sdocIds: number[], sortStatsByGlobal: boolean) =>
  useQuery<TagStat[], Error>([QueryKey.SEARCH_TAG_STATISTICS, Array.from(sdocIds).sort(), sortStatsByGlobal], () => {
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

const SearchHooks = {
  useSearchCodeStats,
  useSearchKeywordStats,
  useSearchTagStats,
  useSearchMemoContent,
  useSearchDocumentsNew,
};

export default SearchHooks;
