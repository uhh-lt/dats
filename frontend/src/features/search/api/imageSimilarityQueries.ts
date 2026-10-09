import { SimsearchService } from "@api/services/SimsearchService";
import type { MyFilter } from "@core/filter";
import { SdocColumns } from "@models/SdocColumns";
import { queryOptions } from "@tanstack/react-query";

interface ImageSimilaritySearchParams {
  projectId: number;
  searchQuery: string;
  filter: MyFilter<SdocColumns>;
  topK: number;
  threshold: number;
}

/**
 * Query factory for the image similarity search.
 *
 *   imageSimilarityQueries.all()          ["imageSimilaritySearch"]
 *   imageSimilarityQueries.search(params) ["imageSimilaritySearch", projectId, searchQuery, ...]
 */
export const imageSimilarityQueries = {
  all: () => ["imageSimilaritySearch"] as const,

  search: ({ projectId, searchQuery, filter, topK, threshold }: ImageSimilaritySearchParams) =>
    queryOptions({
      queryKey: [...imageSimilarityQueries.all(), projectId, searchQuery, filter, topK, threshold] as const,
      queryFn: () =>
        SimsearchService.findSimilarImages({
          projId: projectId,
          threshold,
          topK,
          requestBody: { query: searchQuery, filter },
        }),
      staleTime: 1000 * 60 * 5,
    }),
};
