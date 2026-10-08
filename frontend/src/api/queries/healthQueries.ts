import { DocprocessingService } from "@api/services/DocprocessingService";
import { DocType } from "@models/DocType";
import { SdocHealthResult } from "@models/SdocHealthResult";
import { SortDirection } from "@models/SortDirection";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

interface SdocHealthTableParams {
  projectId: number;
  doctype: DocType;
  sortingModel: { id: string; desc: boolean }[];
  fetchSize: number;
}

/**
 * Query factory for the sdoc health view.
 *
 *   healthQueries.all()                    ["health"]
 *   healthQueries.columns(doctype)         ["health", "columns", doctype]
 *   healthQueries.table(params)            ["health", "table", projectId, doctype, ...]
 */
export const healthQueries = {
  all: () => ["health"] as const,

  columnsScope: () => [...healthQueries.all(), "columns"] as const,
  columns: (doctype: DocType) =>
    queryOptions({
      queryKey: [...healthQueries.columnsScope(), doctype] as const,
      queryFn: () => DocprocessingService.getSearchColumnsByDoctype({ doctype }),
      staleTime: Infinity,
    }),

  tableScope: () => [...healthQueries.all(), "table"] as const,
  table: ({ projectId, doctype, sortingModel, fetchSize }: SdocHealthTableParams) =>
    infiniteQueryOptions({
      queryKey: [...healthQueries.tableScope(), projectId, doctype, sortingModel, fetchSize] as const,
      queryFn: ({ pageParam }) =>
        DocprocessingService.searchSdocHealth({
          projId: projectId,
          doctype,
          requestBody: sortingModel.map((sort) => ({
            column: sort.id,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
          page: pageParam,
          pageSize: fetchSize,
        }),
      initialPageParam: 0,
      getNextPageParam: (_lastGroup, groups) => groups.length,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }),
};

export const flatMapSdocHealthRows = (page: SdocHealthResult) => page.data;
