import { useQuery } from "@tanstack/react-query";
import { TimelineAnalysisService } from "../../../api/openapi/services/TimelineAnalysisService.ts";
import { ColumnInfo } from "../../../components/FilterDialog/filterUtils.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { AppDispatch } from "../../../store/store.ts";
import { TimelineAnalysisActions } from "./timelineAnalysisSlice.ts";

const useGetTimelineAnalysisInfo = (projectId: number, dispatch: AppDispatch) =>
  useQuery<ColumnInfo[]>({
    queryKey: ["tableInfo", "timelineAnalysis", projectId],
    queryFn: async () => {
      const result = await TimelineAnalysisService.info({ projectId });
      const columnInfo = result.map((info) => {
        return {
          ...info,
          column: info.column.toString(),
        };
      });
      const columnInfoMap: Record<string, ColumnInfo> = columnInfo.reduce((acc, info) => {
        return {
          ...acc,
          [info.column]: info,
        };
      }, {});
      dispatch(TimelineAnalysisActions.init({ columnInfoMap }));
      return columnInfo;
    },
    staleTime: Infinity,
  });

export const useInitTimelineAnalysisFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetTimelineAnalysisInfo(projectId, dispatch);

  return columnData;
};
