import { SpanAnnotationService } from "@api/services/SpanAnnotationService";
import { SearchService } from "@api/services/SearchService";
import { type ColumnInfo, tableInfoQueries, toColumnInfos, type MyFilter } from "@core/filter";
import { SpanColumns } from "@models/SpanColumns";
import { SortDirection } from "@models/SortDirection";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";
import type { MRT_SortingState } from "material-react-table";

interface SpanAnnotationTableParams {
  projectId: number | undefined;
  filter: MyFilter<SpanColumns>;
  sortingModel: MRT_SortingState;
  fetchSize: number;
}

/**
 * Span annotations.
 *
 *   spanAnnotationQueries.all()                      ["spanAnnotations"]
 *   spanAnnotationQueries.byId(spanId)               ["spanAnnotations", "detail", spanId]
 *   spanAnnotationQueries.byUserCode(codeId)         ["spanAnnotations", "userCode", codeId]
 *   spanAnnotationQueries.bySdoc(sdocId, userId)     ["spanAnnotations", "sdoc", sdocId, userId]
 */
export const spanAnnotationQueries = {
  all: () => ["spanAnnotations"] as const,

  // a single span annotation
  byIdScope: () => [...spanAnnotationQueries.all(), "detail"] as const,
  byId: (spanId: number | null | undefined) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.byIdScope(), spanId] as const,
      queryFn: !spanId ? skipToken : () => SpanAnnotationService.getById({ spanId }),
      staleTime: 1000 * 60 * 5,
    }),

  // all span annotations of the logged-in user that use a code
  byUserCodeScope: () => [...spanAnnotationQueries.all(), "userCode"] as const,
  byUserCode: (codeId: number | null | undefined) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.byUserCodeScope(), codeId] as const,
      queryFn: !codeId ? skipToken : () => SpanAnnotationService.getByUserCode({ codeId }),
    }),

  // all span annotations of one user in one sdoc
  bySdocScope: () => [...spanAnnotationQueries.all(), "sdoc"] as const,
  // prefix of all span annotation queries of one sdoc (any user), for invalidation
  bySdocOfSdocScope: (sdocId: number) => [...spanAnnotationQueries.bySdocScope(), sdocId] as const,
  bySdoc: (sdocId: number | null | undefined, userId: number | null | undefined) =>
    queryOptions({
      queryKey: [...spanAnnotationQueries.bySdocScope(), sdocId, userId] as const,
      queryFn: !sdocId || !userId ? skipToken : () => SpanAnnotationService.getBySdocAndUser({ sdocId, userId }),
    }),
  // the span annotation filter table
  // the column infos of the span annotation filter table
  tableInfo: (projectId: number, onLoaded?: (columnInfos: ColumnInfo[]) => void) =>
    queryOptions({
      queryKey: tableInfoQueries.bySlice("satFilter", projectId),
      queryFn: async () => {
        const columnInfos = toColumnInfos(await SearchService.searchSpanAnnotationInfo({ projectId }));
        onLoaded?.(columnInfos);
        return columnInfos;
      },
      staleTime: Infinity,
    }),

  tableScope: () => [...spanAnnotationQueries.all(), "table"] as const,
  table: ({ projectId, filter, sortingModel, fetchSize }: SpanAnnotationTableParams) =>
    infiniteQueryOptions({
      queryKey: [...spanAnnotationQueries.tableScope(), projectId, filter, sortingModel, fetchSize] as const,
      queryFn: !projectId
        ? skipToken
        : ({ pageParam }) =>
            SearchService.searchSpanAnnotations({
              requestBody: {
                project_id: projectId,
                filter,
                sorts: sortingModel.map((sort) => ({
                  column: sort.id as SpanColumns,
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
