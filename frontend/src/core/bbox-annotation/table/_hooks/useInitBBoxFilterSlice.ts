import { ColumnInfo, tableInfoQueryKey } from "@components/filter/redux-filter-dialog/index";
import { useAppDispatch } from "@plugins/redux";
import { useQuery } from "@tanstack/react-query";
import { SearchService } from "../../../../api/openapi/services/SearchService";
import { AppDispatch } from "../../../../store/store";
import { BBoxFilterActions } from "../bboxFilterSlice";

const useGetBBoxInfo = (projectId: number, dispatch: AppDispatch) =>
  useQuery<ColumnInfo[]>({
    queryKey: tableInfoQueryKey("bboxFilter", projectId),
    queryFn: async () => {
      const result = await SearchService.searchBboxAnnotationInfo({ projectId });
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
