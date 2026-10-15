import { BboxAnnotationService } from "@api/services/BboxAnnotationService";
import { SearchService } from "@api/services/SearchService";
import { type ColumnInfo, tableInfoQueries, toColumnInfos, type MyFilter } from "@core/filter";
import { BBoxColumns } from "@models/BBoxColumns";
import { SortDirection } from "@models/SortDirection";
import { infiniteQueryOptions, queryOptions, skipToken } from "@tanstack/react-query";
import type { MRT_SortingState } from "material-react-table";

interface BboxAnnotationTableParams {
  projectId: number | undefined;
  filter: MyFilter<BBoxColumns>;
  sortingModel: MRT_SortingState;
  fetchSize: number;
}

/**
 * Bounding box annotations.
 */
export const bboxAnnotationQueries = {
  all: () => ["bboxAnnotation"] as const,

  byIdScope: () => [...bboxAnnotationQueries.all(), "detail"] as const,
  byId: (bboxId: number | null | undefined) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.byIdScope(), bboxId] as const,
      queryFn: !bboxId ? skipToken : () => BboxAnnotationService.getById({ bboxId }),
      staleTime: 1000 * 60 * 5,
    }),

  byUserCodeScope: () => [...bboxAnnotationQueries.all(), "userCode"] as const,
  byUserCode: (codeId: number | null | undefined) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.byUserCodeScope(), codeId] as const,
      queryFn: !codeId ? skipToken : () => BboxAnnotationService.getByUserCode({ codeId }),
    }),

  bySdocScope: () => [...bboxAnnotationQueries.all(), "sdoc"] as const,
  bySdoc: (sdocId: number | null | undefined, userId: number | null | undefined) =>
    queryOptions({
      queryKey: [...bboxAnnotationQueries.bySdocScope(), sdocId, userId] as const,
      queryFn: !sdocId || !userId ? skipToken : () => BboxAnnotationService.getBySdocAndUser({ sdocId, userId }),
    }),
  // the bbox annotation filter table
  // the column infos of the bbox annotation filter table
  tableInfo: (projectId: number, onLoaded?: (columnInfos: ColumnInfo[]) => void) =>
    queryOptions({
      queryKey: tableInfoQueries.bySlice("bboxFilter", projectId),
      queryFn: async () => {
        const columnInfos = toColumnInfos(await SearchService.searchBboxAnnotationInfo({ projectId }));
        onLoaded?.(columnInfos);
        return columnInfos;
      },
      staleTime: Infinity,
    }),

  tableScope: () => [...bboxAnnotationQueries.all(), "table"] as const,
  table: ({ projectId, filter, sortingModel, fetchSize }: BboxAnnotationTableParams) =>
    infiniteQueryOptions({
      queryKey: [...bboxAnnotationQueries.tableScope(), projectId, filter, sortingModel, fetchSize] as const,
      queryFn: !projectId
        ? skipToken
        : ({ pageParam }) =>
            SearchService.searchBboxAnnotations({
              requestBody: {
                project_id: projectId,
                filter,
                sorts: sortingModel.map((sort) => ({
                  column: sort.id as BBoxColumns,
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
