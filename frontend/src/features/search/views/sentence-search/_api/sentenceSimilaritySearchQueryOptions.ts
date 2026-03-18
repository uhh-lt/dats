import { QueryKey } from "@api/hooks/QueryKey";
import { SdocColumns } from "@api/models/SdocColumns";
import { SimsearchService } from "@api/services/SimsearchService";
import { MyFilter } from "@core/filter";
import { queryOptions } from "@tanstack/react-query";

interface SentenceSimilaritySearchQueryOptionsArgs {
  projectId: number;
  searchQuery: string;
  filter: MyFilter<SdocColumns>;
  topK: number;
  threshold: number;
}

export const sentenceSimilaritySearchQueryOptions = ({
  projectId,
  searchQuery,
  filter,
  topK,
  threshold,
}: SentenceSimilaritySearchQueryOptionsArgs) =>
  queryOptions({
    queryKey: [QueryKey.SENT_SIMSEARCH, projectId, searchQuery, filter, topK, threshold],
    queryFn: () =>
      SimsearchService.findSimilarSentences({
        projId: projectId,
        threshold,
        topK,
        requestBody: {
          filter,
          query: searchQuery,
        },
      }),
    staleTime: 1000 * 60 * 5,
  });
