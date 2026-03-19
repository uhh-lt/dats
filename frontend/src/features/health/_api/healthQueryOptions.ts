import { QueryKey } from "@api/hooks/QueryKey";
import { DocType } from "@api/models/DocType";
import { SdocHealthResult } from "@api/models/SdocHealthResult";
import { SortDirection } from "@api/models/SortDirection";
import { DocprocessingService } from "@api/services/DocprocessingService";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

interface SdocHealthTableQueryOptionsArgs {
  projectId: number;
  doctype: DocType;
  sortingModel: { id: string; desc: boolean }[];
  fetchSize: number;
}

export const sdocHealthTableColumnsQueryOptions = (doctype: DocType) =>
  queryOptions({
    queryKey: [QueryKey.SDOC_HEALTH_TABLE_COLUMNS, doctype],
    queryFn: () => DocprocessingService.getSearchColumnsByDoctype({ doctype }),
    staleTime: Infinity,
  });

export const sdocHealthTableQueryOptions = ({
  projectId,
  doctype,
  sortingModel,
  fetchSize,
}: SdocHealthTableQueryOptionsArgs) =>
  infiniteQueryOptions({
    queryKey: [QueryKey.SDOC_HEALTH_TABLE, projectId, doctype, sortingModel, fetchSize],
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
  });

export const flatMapSdocHealthRows = (page: SdocHealthResult) => page.data;
