import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey.ts";

import { MyFilter } from "../components/FilterDialog/filterUtils.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { KeywordStat } from "./openapi/models/KeywordStat.ts";
import { SearchColumns } from "./openapi/models/SearchColumns.ts";
import { SimSearchImageHit } from "./openapi/models/SimSearchImageHit.ts";
import { SimSearchSentenceHit } from "./openapi/models/SimSearchSentenceHit.ts";
import { SortDirection } from "./openapi/models/SortDirection.ts";
import { SpanEntityStat } from "./openapi/models/SpanEntityStat.ts";
import { TagStat } from "./openapi/models/TagStat.ts";
import { SearchService } from "./openapi/services/SearchService.ts";

export abstract class SearchResults<T extends Iterable<unknown> = number[]> {
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

const useFilterCodeStats = (codeId: number, sdocIds: number[]) => {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);

  return useQuery<SpanEntityStat[], Error>({
    queryKey: [QueryKey.FILTER_ENTITY_STATISTICS, sdocIds, codeId, sortStatsByGlobal],
    queryFn: () =>
      SearchService.filterCodeStats({
        codeId,
        requestBody: sdocIds,
        sortByGlobal: sortStatsByGlobal,
      }),
  });
};

const useSearchCodeStats = (codeId: number, projectId: number) => {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);
  const searchQuery = useAppSelector((state) => state.search.searchQuery);
  const sortingModel = useAppSelector((state) => state.search.sortingModel);
  const filter = useAppSelector((state) => state.searchFilter.filter["root"]);

  return useQuery<SpanEntityStat[], Error>({
    queryKey: [QueryKey.SEARCH_ENTITY_STATISTICS, projectId, codeId, searchQuery, filter, sortStatsByGlobal],
    queryFn: () =>
      SearchService.searchCodeStats({
        codeId,
        projectId,
        expertMode: false,
        searchQuery: searchQuery || "",
        requestBody: {
          filter: filter as MyFilter<SearchColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as SearchColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        sortByGlobal: sortStatsByGlobal,
      }),
  });
};

const useFilterKeywordStats = (projectId: number, sdocIds: number[]) => {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);

  return useQuery<KeywordStat[], Error>({
    queryKey: [QueryKey.FILTER_KEYWORD_STATISTICS, projectId, sdocIds, sortStatsByGlobal],
    queryFn: () =>
      SearchService.filterKeywordStats({
        projectId,
        requestBody: sdocIds,
        sortByGlobal: sortStatsByGlobal,
      }),
  });
};

const useSearchKeywordStats = (projectId: number) => {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);
  const searchQuery = useAppSelector((state) => state.search.searchQuery);
  const sortingModel = useAppSelector((state) => state.search.sortingModel);
  const filter = useAppSelector((state) => state.searchFilter.filter["root"]);

  return useQuery<KeywordStat[], Error>({
    queryKey: [QueryKey.SEARCH_KEYWORD_STATISTICS, projectId, searchQuery, filter, sortStatsByGlobal],
    queryFn: () =>
      SearchService.searchKeywordStats({
        projectId,
        expertMode: false,
        searchQuery: searchQuery || "",
        requestBody: {
          filter: filter as MyFilter<SearchColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as SearchColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        sortByGlobal: sortStatsByGlobal,
      }),
  });
};

const useFilterTagStats = (sdocIds: number[]) => {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);

  return useQuery<TagStat[], Error>({
    queryKey: [QueryKey.FILTER_TAG_STATISTICS, sdocIds, sortStatsByGlobal],
    queryFn: () =>
      SearchService.filterTagStats({
        requestBody: sdocIds,
        sortByGlobal: sortStatsByGlobal,
      }),
  });
};

const useSearchTagStats = (projectId: number) => {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);
  const searchQuery = useAppSelector((state) => state.search.searchQuery);
  const sortingModel = useAppSelector((state) => state.search.sortingModel);
  const filter = useAppSelector((state) => state.searchFilter.filter["root"]);

  return useQuery<TagStat[], Error>({
    queryKey: [QueryKey.SEARCH_TAG_STATISTICS, projectId, searchQuery, filter, sortStatsByGlobal],
    queryFn: () =>
      SearchService.searchTagStats({
        projectId,
        expertMode: false,
        searchQuery: searchQuery || "",
        requestBody: {
          filter: filter as MyFilter<SearchColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as SearchColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        sortByGlobal: sortStatsByGlobal,
      }),
  });
};

const SearchHooks = {
  useSearchCodeStats,
  useSearchKeywordStats,
  useSearchTagStats,
  useFilterCodeStats,
  useFilterKeywordStats,
  useFilterTagStats,
};

export default SearchHooks;
