import { SentenceAnnotationService } from "@api/services/SentenceAnnotationService";
import { SearchService } from "@api/services/SearchService";
import { type ColumnInfo, tableInfoQueries, toColumnInfos, type MyFilter } from "@core/filter";
import { SentAnnoColumns } from "@models/SentAnnoColumns";
import { SortDirection } from "@models/SortDirection";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";
import type { MRT_SortingState } from "material-react-table";

interface SentenceAnnotationTableParams {
  projectId: number | undefined;
  filter: MyFilter<SentAnnoColumns>;
  sortingModel: MRT_SortingState;
  fetchSize: number;
}

/**
 * Sentence annotations. The per-sdoc query returns the annotations grouped by sentence
 * (SentenceAnnotatorResult), not a flat list.
 */
export const sentenceAnnotationQueries = {
  all: () => ["sentenceAnnotation"] as const,

  byIdScope: () => [...sentenceAnnotationQueries.all(), "detail"] as const,
  byId: (sentenceAnnoId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sentenceAnnotationQueries.byIdScope(), sentenceAnnoId] as const,
      queryFn: !sentenceAnnoId ? skipToken : () => SentenceAnnotationService.getById({ sentenceAnnoId }),
      staleTime: 1000 * 60 * 5,
    }),

  bySdocScope: () => [...sentenceAnnotationQueries.all(), "sdoc"] as const,
  bySdoc: (sdocId: number | null | undefined, userId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sentenceAnnotationQueries.bySdocScope(), sdocId, userId] as const,
      queryFn: !sdocId || !userId ? skipToken : () => SentenceAnnotationService.getBySdocAndUser({ sdocId, userId }),
    }),
  // the sentence annotation filter table
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

  tableScope: () => [...sentenceAnnotationQueries.all(), "table"] as const,
  table: ({ projectId, filter, sortingModel, fetchSize }: SentenceAnnotationTableParams) =>
    infiniteQueryOptions({
      queryKey: [...sentenceAnnotationQueries.tableScope(), projectId, filter, sortingModel, fetchSize] as const,
      queryFn: !projectId
        ? skipToken
        : ({ pageParam }) =>
            SearchService.searchSentenceAnnotations({
              requestBody: {
                project_id: projectId,
                filter,
                sorts: sortingModel.map((sort) => ({
                  column: sort.id as SentAnnoColumns,
                  direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
                })),
                page_number: pageParam,
                page_size: fetchSize,
              },
            }),
      initialPageParam: 0,
      getNextPageParam: (_lastGroup, groups) => groups.length,
      refetchOnWindowFocus: false,
    }),
};
