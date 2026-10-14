import { annotationQueries } from "@core/annotation";
import { toColumnInfoMap } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { SEATFilterActions } from "../seatFilterSlice";

export const useInitSEATFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useQuery(annotationQueries.sentence.tableInfo(projectId));

  // the filter slice needs the column infos (the query is cached, the slice is initialized whenever they arrive)
  useEffect(() => {
    if (columnData) dispatch(SEATFilterActions.init({ columnInfoMap: toColumnInfoMap(columnData) }));
  }, [columnData, dispatch]);

  return columnData;
};
