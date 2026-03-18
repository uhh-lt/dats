import { ColumnInfo } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { searchTableInfoQueryOptions } from "../_api/searchQueryOptions";
import { SearchActions } from "../store/documentSearchSlice";

const useGetSearchInfo = (projectId: number) => useQuery(searchTableInfoQueryOptions(projectId));

export const useInitSearchFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetSearchInfo(projectId);

  const columnInfoMap = useMemo(
    () =>
      (columnData || []).reduce(
        (acc, info) => {
          acc[info.column] = info;
          return acc;
        },
        {} as Record<string, ColumnInfo>,
      ),
    [columnData],
  );

  useEffect(() => {
    if (!columnData || columnData.length === 0) return;
    dispatch(SearchActions.init({ columnInfoMap }));
  }, [columnData, columnInfoMap, dispatch]);

  return columnData;
};
