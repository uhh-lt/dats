import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AnalysisService } from "../../api/openapi/services/AnalysisService.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { SATFilterActions } from "./satFilterSlice.ts";

const useGetSATInfo = (projectId: number) =>
  useQuery({
    queryKey: ["tableInfo", "spanAnnotationTable", projectId],
    queryFn: () => AnalysisService.annotatedSegmentsInfo({ projectId }),
  });

export const useInitSATFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const tableInfo = useGetSATInfo(projectId);

  // effects
  useEffect(() => {
    if (!tableInfo.data) return;
    dispatch(
      SATFilterActions.init({
        columnInfo: tableInfo.data.map((d) => {
          return { ...d, column: d.column.toString() };
        }),
      }),
    );
    console.log("initialized span annotation table filterSlice!");
  }, [dispatch, tableInfo.data]);

  return tableInfo;
};
