import { SearchService } from "@api/services/SearchService";
import { ColumnInfo, tableInfoQueryKey } from "@core/filter";
import { AppDispatch } from "@store/store";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { MemoFilterActions } from "../memoFilterSlice";

const useGetMemoSearchInfo = (projectId: number, dispatch: AppDispatch) =>
  useQuery<ColumnInfo[]>({
    queryKey: tableInfoQueryKey("memoFilter", projectId),
    queryFn: async () => {
      const result = await SearchService.searchMemoInfo({ projectId });
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
      dispatch(MemoFilterActions.init({ columnInfoMap }));
      return columnInfo;
    },
    staleTime: Infinity,
  });

export const useInitMemoFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetMemoSearchInfo(projectId, dispatch);

  return columnData;
};
