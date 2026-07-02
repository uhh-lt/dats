import { QueryKey } from "@api/hooks/QueryKey";
import { SimsearchService } from "@api/services/SimsearchService";
import { MyFilter } from "@core/filter";
import { SdocColumns } from "@models/SdocColumns";
import { queryOptions } from "@tanstack/react-query";

interface ImageSimilaritySearchQueryOptionsArgs {
  projectId: number;
  searchQuery: string;
  filter: MyFilter<SdocColumns>;
  topK: number;
  threshold: number;
}

export const imageSimilaritySearchQueryOptions = ({
  projectId,
  searchQuery,
  filter,
  topK,
  threshold,
}: ImageSimilaritySearchQueryOptionsArgs) =>
  queryOptions({
    queryKey: [QueryKey.IMG_SIMSEARCH, projectId, searchQuery, filter, topK, threshold],
    queryFn: () =>
      SimsearchService.findSimilarImages({
        projId: projectId,
        threshold,
        topK,
        requestBody: {
          query: searchQuery,
          filter,
        },
      }),
    staleTime: 1000 * 60 * 5,
  });
