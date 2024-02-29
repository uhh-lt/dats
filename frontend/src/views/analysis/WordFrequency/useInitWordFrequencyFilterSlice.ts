import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { WordFrequencyFilterActions } from "./wordFrequencyFilterSlice.ts";

const useGetWordFrequencyTableInfo = (projectId: number) =>
  useQuery({
    queryKey: ["tableInfo", "wordFrequency", projectId],
    queryFn: () => AnalysisService.wordFrequencyAnalysisInfo({ projectId }),
  });

export const useInitWordFrequencyFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const tableInfo = useGetWordFrequencyTableInfo(projectId);

  // effects
  useEffect(() => {
    if (!tableInfo.data) return;
    dispatch(
      WordFrequencyFilterActions.init({
        columnInfo: tableInfo.data.map((d) => {
          return { ...d, column: d.column.toString() };
        }),
      }),
    );
    console.log("initialized word frequency filterSlice!");
  }, [dispatch, tableInfo.data]);

  return tableInfo;
};
