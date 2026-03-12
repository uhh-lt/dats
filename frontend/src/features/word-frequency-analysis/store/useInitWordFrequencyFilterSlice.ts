import { WordFrequencyService } from "@api/services/WordFrequencyService";
import { ColumnInfo, tableInfoQueryKey } from "@core/filter";
import { AppDispatch } from "@store/store";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
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
