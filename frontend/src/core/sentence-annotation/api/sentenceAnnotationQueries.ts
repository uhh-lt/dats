import { SentenceAnnotationService } from "@api/services/SentenceAnnotationService";
import { SearchService } from "@api/services/SearchService";
import { type ColumnInfo, tableInfoQueries, toColumnInfos } from "@core/filter";
import type { QueryRequest_SentAnnoColumns_ } from "@models/QueryRequest_SentAnnoColumns_";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Sentence annotations. The per-sdoc query returns the annotations grouped by sentence
 * (SentenceAnnotatorResult), not a flat list.
 */
export const sentenceAnnotationQueries = {
  all: () => ["sentenceAnnotation"] as const,

  // the mutations that update a cache optimistically (see rollbackOptimisticUpdate); only these are counted there
  optimisticMutationScope: () => [...sentenceAnnotationQueries.all(), "optimistic"] as const,

  byIdScope: () => [...sentenceAnnotationQueries.all(), "detail"] as const,
  byId: (sentenceAnnoId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sentenceAnnotationQueries.byIdScope(), sentenceAnnoId] as const,
      queryFn: !sentenceAnnoId ? skipToken : () => SentenceAnnotationService.getById({ sentenceAnnoId }),
      staleTime: 1000 * 60 * 5,
    }),

  bySdocScope: () => [...sentenceAnnotationQueries.all(), "sdoc"] as const,
  // prefix of all sentence annotation queries of one sdoc (any user), for invalidation
  bySdocOfSdocScope: (sdocId: number) => [...sentenceAnnotationQueries.bySdocScope(), sdocId] as const,
  bySdoc: (sdocId: number | null | undefined, userId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sentenceAnnotationQueries.bySdocScope(), sdocId, userId] as const,
      queryFn: !sdocId || !userId ? skipToken : () => SentenceAnnotationService.getBySdocAndUser({ sdocId, userId }),
    }),
  // the column infos of the sentence annotation filter table
  tableInfo: (projectId: number, onLoaded?: (columnInfos: ColumnInfo[]) => void) =>
    queryOptions({
      queryKey: tableInfoQueries.bySlice("seatFilter", projectId),
      queryFn: async () => {
        const columnInfos = toColumnInfos(await SearchService.searchSentenceAnnotationInfo({ projectId }));
        onLoaded?.(columnInfos);
        return columnInfos;
      },
      staleTime: Infinity,
    }),

  searchScope: () => [...sentenceAnnotationQueries.all(), "search"] as const,
  search: (request: QueryRequest_SentAnnoColumns_) =>
    infiniteQueryOptions({
      queryKey: [...sentenceAnnotationQueries.searchScope(), request] as const,
      queryFn: ({ pageParam }) =>
        SearchService.searchSentenceAnnotations({ requestBody: { ...request, page_number: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (_lastPage, pages) => pages.length,
      refetchOnWindowFocus: false,
    }),
};
