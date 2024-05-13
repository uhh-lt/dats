import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { ColumnInfo, ColumnInfoResponse } from "../../../features/FilterDialog/filterUtils.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { WordFrequencyFilterActions } from "./wordFrequencyFilterSlice.ts";

const useGetWordFrequencyTableInfo = (projectId: number) =>
  useQuery<ColumnInfoResponse>({
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
      return {
        info: columnInfo,
        map: columnInfoMap,
      };
    },
    staleTime: Infinity,
  });

export const useInitWordFrequencyFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetWordFrequencyTableInfo(projectId);

  // effects
  useEffect(() => {
    if (!columnData) return;
    dispatch(WordFrequencyFilterActions.init({ columnInfoMap: columnData.map }));
    console.log("initialized word frequency filterSlice!");
  }, [dispatch, columnData]);

  return columnData?.info;
};
