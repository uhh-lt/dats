import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { AnnotatedSegmentsFilterActions } from "./annotatedSegmentsFilterSlice.ts";

const useGetAnnotatedSegmentsTableInfo = (projectId: number) =>
  useQuery({
    queryKey: ["tableInfo", "annotatedSegments", projectId],
    queryFn: () => AnalysisService.annotatedSegmentsInfo({ projectId }),
  });

export const useInitAnnotatedSegmentsFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const tableInfo = useGetAnnotatedSegmentsTableInfo(projectId);

  // effects
  useEffect(() => {
    if (!tableInfo.data) return;
    dispatch(
      AnnotatedSegmentsFilterActions.init({
        columnInfo: tableInfo.data.map((d) => {
          return { ...d, column: d.column.toString() };
        }),
      }),
    );
    console.log("initialized annotated segments filterSlice!");
  }, [dispatch, tableInfo.data]);

  return tableInfo;
};
