import { SearchService } from "@api/services/SearchService";
import { ColumnInfo, tableInfoQueryKey } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { SearchActions } from "../store/documentSearchSlice";

const searchTableInfoQueryOptions = (projectId: number, callback?: (data: ColumnInfo[]) => void) =>
  queryOptions({
    queryKey: tableInfoQueryKey("search", projectId),
    queryFn: async () => {
      const result = await SearchService.searchSdocInfo({ projectId });
      const columnInfo = result.map((info) => ({
        ...info,
        column: info.column.toString(),
      })) as ColumnInfo[];
      callback?.(columnInfo);
      return columnInfo;
    },
    staleTime: Infinity,
  });

export const useInitSearchFilterSlice = ({ projectId }: { projectId: number }) => {
  const dispatch = useAppDispatch();
  const initializeSearchFilterSlice = useCallback(
    (columnInfo: ColumnInfo[]) => {
      dispatch(
        SearchActions.init({
          columnInfoMap: columnInfo.reduce(
            (acc, info) => {
              acc[info.column] = info;
              return acc;
            },
            {} as Record<string, ColumnInfo>,
          ),
        }),
      );
    },
    [dispatch],
  );

  const { data: columnData } = useQuery(searchTableInfoQueryOptions(projectId, initializeSearchFilterSlice));
  return columnData;
};
