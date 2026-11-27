import { SimilaritySearchService } from "@api/services/SimilaritySearchService";
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
 *   similaritySearchQueries.all()                    ["similaritySearch"]
 *   similaritySearchQueries.projectScope(projectId)  ["similaritySearch", "project", projectId]
 *   similaritySearchQueries.image(params)            ["similaritySearch", "project", projectId, "image", searchQuery, ...]
 *   similaritySearchQueries.sentence(params)         ["similaritySearch", "project", projectId, "sentence", searchQuery, ...]
 */
export const similaritySearchQueries = {
  all: () => ["similaritySearch"] as const,
  // prefix of all similarity searches of one project
  projectScope: (projectId: number) => [...similaritySearchQueries.all(), "project", projectId] as const,

  imageScope: (projectId: number) => [...similaritySearchQueries.projectScope(projectId), "image"] as const,
  image: ({ projectId, searchQuery, filter, topK, threshold }: SimilaritySearchParams) =>
    queryOptions({
      queryKey: [...similaritySearchQueries.imageScope(projectId), searchQuery, filter, topK, threshold] as const,
      queryFn: () =>
        SimilaritySearchService.findSimilarImages({
          projectId,
          requestBody: { query: searchQuery, top_k: topK, threshold, filter },
        }),
      staleTime: 1000 * 60 * 5,
    }),

  sentenceScope: (projectId: number) => [...similaritySearchQueries.projectScope(projectId), "sentence"] as const,
  sentence: ({ projectId, searchQuery, filter, topK, threshold }: SimilaritySearchParams) =>
    queryOptions({
      queryKey: [...similaritySearchQueries.sentenceScope(projectId), searchQuery, filter, topK, threshold] as const,
      queryFn: () =>
        SimilaritySearchService.findSimilarSentences({
          projectId,
          requestBody: { query: searchQuery, top_k: topK, threshold, filter },
        }),
      staleTime: 1000 * 60 * 5,
    }),
};
