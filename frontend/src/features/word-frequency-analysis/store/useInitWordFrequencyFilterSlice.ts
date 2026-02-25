import { ColumnInfo, tableInfoQueryKey } from "@components/filter/redux-filter-dialog/index";
import { useAppDispatch } from "@plugins/redux";
import { useQuery } from "@tanstack/react-query";
import { WordFrequencyService } from "../../../api/openapi/services/WordFrequencyService";
import { AppDispatch } from "../../../store/store";
import { WordFrequencyActions } from "./wordFrequencySlice";

const useGetWordFrequencyTableInfo = (projectId: number, dispatch: AppDispatch) =>
  useQuery<ColumnInfo[]>({
    queryKey: tableInfoQueryKey("wordFrequency", projectId),
    queryFn: async () => {
      const result = await WordFrequencyService.wordFrequencyAnalysisInfo({ projectId });
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
      dispatch(WordFrequencyActions.init({ columnInfoMap }));
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
