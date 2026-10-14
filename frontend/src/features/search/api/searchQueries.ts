import { SimsearchService } from "@api/services/SimsearchService";
import type { MyFilter } from "@core/filter";
import { SdocColumns } from "@models/SdocColumns";
import { queryOptions } from "@tanstack/react-query";

interface SimilaritySearchParams {
  projectId: number;
  searchQuery: string;
  filter: MyFilter<SdocColumns>;
  topK: number;
  threshold: number;
}

/**
 * Query factory for the similarity searches of the search feature (the document search is `sdocQueries.search`).
 *
 *   searchQueries.all()               ["similaritySearch"]
 *   searchQueries.image(params)       ["similaritySearch", "image", projectId, searchQuery, ...]
 *   searchQueries.sentence(params)    ["similaritySearch", "sentence", projectId, searchQuery, ...]
 */
export const searchQueries = {
  all: () => ["similaritySearch"] as const,

  imageScope: () => [...searchQueries.all(), "image"] as const,
  image: ({ projectId, searchQuery, filter, topK, threshold }: SimilaritySearchParams) =>
    queryOptions({
      queryKey: [...searchQueries.imageScope(), projectId, searchQuery, filter, topK, threshold] as const,
      queryFn: () =>
        SimsearchService.findSimilarImages({
          projId: projectId,
          threshold,
          topK,
          requestBody: { query: searchQuery, filter },
        }),
      staleTime: 1000 * 60 * 5,
    }),

  sentenceScope: () => [...searchQueries.all(), "sentence"] as const,
  sentence: ({ projectId, searchQuery, filter, topK, threshold }: SimilaritySearchParams) =>
    queryOptions({
      queryKey: [...searchQueries.sentenceScope(), projectId, searchQuery, filter, topK, threshold] as const,
      queryFn: () =>
        SimsearchService.findSimilarSentences({
          projId: projectId,
          threshold,
          topK,
          requestBody: { filter, query: searchQuery },
        }),
      staleTime: 1000 * 60 * 5,
    }),
};
