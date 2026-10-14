import { toColumnInfoMap } from "@core/filter";
import { TimelineAnalysisRead } from "@models/TimelineAnalysisRead";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { timelineAnalysisQueries } from "../../../api/timelineAnalysisQueries";
import { TimelineAnalysisActions } from "../../../store/timelineAnalysisSlice";

export const useInitTimelineAnalysisFilterSlice = ({
  timelineAnalysis,
}: {
  timelineAnalysis: TimelineAnalysisRead;
}) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useQuery(timelineAnalysisQueries.tableInfo(timelineAnalysis));

  // the filter slice needs the column infos (the query is cached, the slice is initialized whenever they arrive)
  useEffect(() => {
    if (columnData) dispatch(TimelineAnalysisActions.init({ columnInfoMap: toColumnInfoMap(columnData) }));
  }, [columnData, dispatch]);

  return columnData;
};
