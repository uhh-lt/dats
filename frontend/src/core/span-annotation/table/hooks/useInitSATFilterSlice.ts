import { useQuery } from "@tanstack/react-query";
import { SearchService } from "../../../../api/openapi/services/SearchService.ts";
import { tableInfoQueryKey } from "../../../../components/FilterDialog/filterSlice.ts";
import { ColumnInfo } from "../../../../components/FilterDialog/filterUtils.ts";
import { useAppDispatch } from "../../../../plugins/ReduxHooks.ts";
import { AppDispatch } from "../../../../store/store.ts";
import { SATFilterActions } from "../satFilterSlice.ts";

const useGetSATInfo = (projectId: number, dispatch: AppDispatch) =>
  useQuery<ColumnInfo[]>({
    queryKey: tableInfoQueryKey("satFilter", projectId),
    queryFn: async () => {
      const result = await SearchService.searchSpanAnnotationInfo({ projectId });
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
      dispatch(SATFilterActions.init({ columnInfoMap }));
      return columnInfo;
    },
    staleTime: Infinity,
  });

export const useInitSATFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetSATInfo(projectId, dispatch);

  return columnData;
};
