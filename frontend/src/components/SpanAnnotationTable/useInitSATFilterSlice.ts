import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AnalysisService } from "../../api/openapi/services/AnalysisService.ts";
import { ColumnInfo, ColumnInfoResponse } from "../../features/FilterDialog/filterUtils.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { SATFilterActions } from "./satFilterSlice.ts";

const useGetSATInfo = (projectId: number) =>
  useQuery<ColumnInfoResponse>({
    queryKey: ["tableInfo", "spanAnnotationTable", projectId],
    queryFn: async () => {
      const result = await AnalysisService.annotatedSegmentsInfo({ projectId });
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

export const useInitSATFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetSATInfo(projectId);

  // effects
  useEffect(() => {
    if (!columnData) return;
    dispatch(SATFilterActions.init({ columnInfoMap: columnData.map }));
    console.log("initialized span annotation table filterSlice!");
  }, [dispatch, columnData]);

  return columnData?.info;
};
