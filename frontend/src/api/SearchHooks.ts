import { useQuery } from "@tanstack/react-query";
import { MyFilter } from "../features/FilterDialog/filterUtils.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { QueryKey } from "./QueryKey.ts";

import { MRT_SortingState } from "material-react-table";
import { QueryType } from "../views/search/QueryType.ts";
import { KeywordStat } from "./openapi/models/KeywordStat.ts";
import { MemoContentQuery } from "./openapi/models/MemoContentQuery.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
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
  sortModel: MRT_SortingState,
) => {
  return async () => {
    const sdocIds = await SearchService.searchSdocs({
      projectId: projectId!,
      searchQuery,
      expertMode,
      requestBody: {
        filter: filter as MyFilter<SearchColumns>,
        sorts: sortModel.map((sort) => ({
          column: sort.id as SearchColumns,
          direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
        })),
      },
    });
    return new LexicalSearchResults(sdocIds);
  };
};

const useSearchDocumentsNew = (projectId: number) => {
  const filter = useAppSelector((state) => state.searchFilter.filter["root"]);
  const sortModel = useAppSelector((state) => state.search.sortingModel);
  const searchQuery = useAppSelector((state) => state.search.searchQuery);
  const expertMode = useAppSelector((state) => state.search.expertMode);
  const searchType = useAppSelector((state) => state.search.searchType);

  let searchFn: () => Promise<LexicalSearchResults | ImageSimilaritySearchResults | SentenceSimilaritySearchResults>;
  switch (searchType) {
    case QueryType.SEMANTIC_IMAGES:
      searchFn = imageSimilaritySearchQueryFn(projectId, searchQuery, filter as MyFilter<SearchColumns>);
      break;
    case QueryType.SEMANTIC_SENTENCES:
      searchFn = sentenceSimilaritySearchQueryFn(projectId, searchQuery, filter as MyFilter<SearchColumns>);
      break;
    case QueryType.LEXICAL:
    default:
      searchFn = lexicalSearchQueryFn(
        projectId,
        searchQuery.toString(),
        expertMode,
        filter as MyFilter<SearchColumns>,
        sortModel,
      );
      break;
  }

  return useQuery<LexicalSearchResults | ImageSimilaritySearchResults | SentenceSimilaritySearchResults, Error>({
    queryKey: [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, projectId, filter, sortModel, searchQuery, searchType],
    queryFn: searchFn,
    enabled: !!projectId,
  });
};

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

const useSearchMemoContent = (params: MemoContentQuery) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.MEMOS_BY_CONTENT_SEARCH, params],
    queryFn: async () => {
      const result = await SearchService.searchMemosByContentQuery({
        requestBody: params,
      });

      return result.memos;
    },
    enabled: params.content_query.length > 0,
  });

const SearchHooks = {
  useSearchCodeStats,
  useSearchKeywordStats,
  useSearchTagStats,
  useSearchMemoContent,
  useSearchDocumentsNew,
};

export default SearchHooks;
