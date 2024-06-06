import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey.ts";

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

export enum SearchResultsType {
  // type DOCUMENTS returns data: number[]
  DOCUMENTS,
  // type SENTENCES returns data: sdocId -> SimSearchSentenceHit[]
  SENTENCES,
}

const useSearchCodeStats = (codeId: number, sdocIds: number[], sortStatsByGlobal: boolean, enabled: boolean) => {
  const sortedSdocIds = Array.from(sdocIds).sort();
  return useQuery<SpanEntityStat[], Error>({
    queryKey: [QueryKey.SEARCH_ENTITY_STATISTICS, codeId, sortedSdocIds, sortStatsByGlobal],
    queryFn: () =>
      SearchService.searchCodeStats({
        codeId: codeId,
        requestBody: sortedSdocIds,
        sortByGlobal: sortStatsByGlobal,
      }),
    enabled,
  });
};

const useSearchKeywordStats = (projectId: number, sdocIds: number[], sortStatsByGlobal: boolean) => {
  const sortedSdocIds = Array.from(sdocIds).sort();
  return useQuery<KeywordStat[], Error>({
    queryKey: [QueryKey.SEARCH_KEYWORD_STATISTICS, projectId, sortedSdocIds, sortStatsByGlobal],
    queryFn: () => {
      return SearchService.searchKeywordStats({
        projectId: projectId,
        requestBody: sortedSdocIds,
        sortByGlobal: sortStatsByGlobal,
      });
    },
  });
};

const useSearchTagStats = (sdocIds: number[], sortStatsByGlobal: boolean) => {
  const sortedSdocIds = Array.from(sdocIds).sort();
  return useQuery<TagStat[], Error>({
    queryKey: [QueryKey.SEARCH_TAG_STATISTICS, sortedSdocIds, sortStatsByGlobal],
    queryFn: () => {
      return SearchService.searchTagStats({
        requestBody: sortedSdocIds,
        sortByGlobal: sortStatsByGlobal,
      });
    },
  });
};

const SearchHooks = {
  useSearchCodeStats,
  useSearchKeywordStats,
  useSearchTagStats,
};

export default SearchHooks;
