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
 *   similaritySearchQueries.all()               ["similaritySearch"]
 *   similaritySearchQueries.image(params)       ["similaritySearch", "image", projectId, searchQuery, ...]
 *   similaritySearchQueries.sentence(params)    ["similaritySearch", "sentence", projectId, searchQuery, ...]
 */
export const similaritySearchQueries = {
  all: () => ["similaritySearch"] as const,

  imageScope: () => [...similaritySearchQueries.all(), "image"] as const,
  image: ({ projectId, searchQuery, filter, topK, threshold }: SimilaritySearchParams) =>
    queryOptions({
      queryKey: [...similaritySearchQueries.imageScope(), projectId, searchQuery, filter, topK, threshold] as const,
      queryFn: () =>
        SimsearchService.findSimilarImages({
          projId: projectId,
          threshold,
          topK,
          requestBody: { query: searchQuery, filter },
        }),
      staleTime: 1000 * 60 * 5,
    }),

  sentenceScope: () => [...similaritySearchQueries.all(), "sentence"] as const,
  sentence: ({ projectId, searchQuery, filter, topK, threshold }: SimilaritySearchParams) =>
    queryOptions({
      queryKey: [...similaritySearchQueries.sentenceScope(), projectId, searchQuery, filter, topK, threshold] as const,
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
