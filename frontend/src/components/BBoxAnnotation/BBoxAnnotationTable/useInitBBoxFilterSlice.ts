import { useQuery } from "@tanstack/react-query";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { AppDispatch } from "../../../store/store.ts";
import { tableInfoQueryKey } from "../../FilterDialog/filterSlice.ts";
import { ColumnInfo } from "../../FilterDialog/filterUtils.ts";
import { BBoxFilterActions } from "./bboxFilterSlice.ts";

const useGetBBoxInfo = (projectId: number, dispatch: AppDispatch) =>
  useQuery<ColumnInfo[]>({
    queryKey: tableInfoQueryKey("bboxFilter", projectId),
    queryFn: async () => {
      const result = await AnalysisService.annotatedImagesInfo({ projectId });
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
      dispatch(BBoxFilterActions.init({ columnInfoMap }));
      return columnInfo;
    },
    staleTime: Infinity,
  });

export const useInitBBoxFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetBBoxInfo(projectId, dispatch);

  return columnData;
};
