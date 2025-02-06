import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey.ts";

import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { KeywordStat } from "./openapi/models/KeywordStat.ts";
import { SimSearchImageHit } from "./openapi/models/SimSearchImageHit.ts";
import { SimSearchSentenceHit } from "./openapi/models/SimSearchSentenceHit.ts";
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

const useFilterCodeStats = (codeId: number, sdocIds: number[] | null | undefined) => {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);

  return useQuery<SpanEntityStat[], Error>({
    queryKey: [QueryKey.FILTER_ENTITY_STATISTICS, sdocIds, codeId, sortStatsByGlobal],
    queryFn: () =>
      SearchService.filterCodeStats({
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
      SearchService.filterKeywordStats({
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
      SearchService.filterTagStats({
        requestBody: sdocIds!,
        sortByGlobal: sortStatsByGlobal,
      }),
    enabled: !!sdocIds,
    staleTime: 1000 * 60 * 5,
  });
};

const SearchHooks = {
  useFilterCodeStats,
  useFilterKeywordStats,
  useFilterTagStats,
};

export default SearchHooks;
