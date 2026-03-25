import { WordFrequencyService } from "@api/services/WordFrequencyService";
import { ColumnInfo, tableInfoQueryKey } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { WordFrequencyActions } from "../store/wordFrequencySlice";

const wordFrequencyTableInfoQueryOptions = (projectId: number, callback?: (columnInfo: ColumnInfo[]) => void) =>
  queryOptions({
    queryKey: tableInfoQueryKey("wordFrequency", projectId),
    queryFn: async () => {
      const result = await WordFrequencyService.wordFrequencyAnalysisInfo({ projectId });
      const columnInfo = result.map((info) => ({
        ...info,
        column: info.column.toString(),
      })) as ColumnInfo[];
      callback?.(columnInfo);
      return columnInfo;
    },
    staleTime: Infinity,
  });

export const useInitWordFrequencyFilterSlice = ({ projectId }: { projectId: number }) => {
  const dispatch = useAppDispatch();
  const initializeWordFrequencyFilterSlice = useCallback(
    (columnInfo: ColumnInfo[]) => {
      dispatch(
        WordFrequencyActions.init({
          columnInfoMap: columnInfo.reduce(
            (acc, info) => {
              acc[info.column] = info;
              return acc;
            },
            {} as Record<string, ColumnInfo>,
          ),
        }),
      );
    },
    [dispatch],
  );

  const { data: columnData } = useQuery(
    wordFrequencyTableInfoQueryOptions(projectId, initializeWordFrequencyFilterSlice),
  );
  return columnData;
};
