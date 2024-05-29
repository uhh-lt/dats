import { useQuery } from "@tanstack/react-query";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { ColumnInfo } from "../../../features/FilterDialog/filterUtils.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { AppDispatch } from "../../../store/store.ts";
import { WordFrequencyFilterActions } from "./wordFrequencyFilterSlice.ts";

const useGetWordFrequencyTableInfo = (projectId: number, dispatch: AppDispatch) =>
  useQuery<ColumnInfo[]>({
    queryKey: ["tableInfo", "wordFrequency", projectId],
    queryFn: async () => {
      const result = await AnalysisService.wordFrequencyAnalysisInfo({ projectId });
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
      dispatch(WordFrequencyFilterActions.init({ columnInfoMap }));
      return columnInfo;
    },
    staleTime: Infinity,
  });

export const useInitWordFrequencyFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetWordFrequencyTableInfo(projectId, dispatch);

  return columnData;
};
