import { toColumnInfoMap } from "@core/filter";
import { sdocQueries } from "@core/source-document";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { SearchActions } from "../store/documentSearchSlice";

export const useInitSearchFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useQuery(sdocQueries.search.tableInfo(projectId));

  // the filter slice needs the column infos (the query is cached, the slice is initialized whenever they arrive)
  useEffect(() => {
    if (columnData) dispatch(SearchActions.init({ columnInfoMap: toColumnInfoMap(columnData) }));
  }, [columnData, dispatch]);

  return columnData;
};
