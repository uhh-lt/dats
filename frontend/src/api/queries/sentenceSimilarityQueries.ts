import { SimsearchService } from "@api/services/SimsearchService";
// eslint-disable-next-line boundaries/element-types
import type { MyFilter } from "@core/filter";
import { SdocColumns } from "@models/SdocColumns";
import { queryOptions } from "@tanstack/react-query";

interface SentenceSimilaritySearchParams {
  projectId: number;
  searchQuery: string;
  filter: MyFilter<SdocColumns>;
  topK: number;
  threshold: number;
}

/**
 * Query factory for the sentence similarity search.
 *
 *   sentenceSimilarityQueries.all()          ["sentenceSimilaritySearch"]
 *   sentenceSimilarityQueries.search(params) ["sentenceSimilaritySearch", projectId, searchQuery, ...]
 */
export const sentenceSimilarityQueries = {
  all: () => ["sentenceSimilaritySearch"] as const,

  search: ({ projectId, searchQuery, filter, topK, threshold }: SentenceSimilaritySearchParams) =>
    queryOptions({
      queryKey: [...sentenceSimilarityQueries.all(), projectId, searchQuery, filter, topK, threshold] as const,
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
