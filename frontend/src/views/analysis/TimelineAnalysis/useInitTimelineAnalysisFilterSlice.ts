import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AnalysisService } from "../../../api/openapi";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import { TimelineAnalysisFilterActions } from "./timelineAnalysisFilterSlice";

const useGetTimelineAnalysisInfo = (projectId: number) =>
  useQuery(["tableInfo", "timelineAnalysis", projectId], () => AnalysisService.timelineAnalysis2Info({ projectId }));

export const useInitTimelineAnalysisFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const tableInfo = useGetTimelineAnalysisInfo(projectId);

  // effects
  useEffect(() => {
    if (!tableInfo.data) return;
    dispatch(
      TimelineAnalysisFilterActions.init({
        columnInfo: tableInfo.data.map((d) => {
          return { ...d, column: d.column.toString() };
        }),
      }),
    );
    console.log("initialized timeline analysis filterSlice!");
  }, [dispatch, tableInfo.data]);

  return tableInfo;
};
