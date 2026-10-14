import { toColumnInfoMap } from "@core/filter";
import { TimelineAnalysisRead } from "@models/TimelineAnalysisRead";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { timelineAnalysisQueries } from "../../../api/timelineAnalysisQueries";
import { TimelineAnalysisActions } from "../../../store/timelineAnalysisSlice";

export const useInitTimelineAnalysisFilterSlice = ({
  timelineAnalysis,
}: {
  timelineAnalysis: TimelineAnalysisRead;
}) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query); the slice is initialized as a side effect of fetching the column infos
  const { data: columnData } = useQuery(
    timelineAnalysisQueries.tableInfo(timelineAnalysis, (columnInfos) =>
      dispatch(TimelineAnalysisActions.init({ columnInfoMap: toColumnInfoMap(columnInfos) })),
    ),
  );

  return columnData;
};
