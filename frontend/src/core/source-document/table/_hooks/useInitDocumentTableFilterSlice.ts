import { toColumnInfoMap } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { sdocQueries } from "../../api/sdocQueries";
import { SdocTableFilterActions } from "../sdocTableFilterSlice";

export const useInitDocumentTableFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useQuery(sdocQueries.tableInfo(projectId));

  // the filter slice needs the column infos (the query is cached, the slice is initialized whenever they arrive)
  useEffect(() => {
    if (columnData) dispatch(SdocTableFilterActions.init({ columnInfoMap: toColumnInfoMap(columnData) }));
  }, [columnData, dispatch]);

  return columnData;
};
