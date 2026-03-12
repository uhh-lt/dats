import { SearchService } from "@api/services/SearchService";
import { ColumnInfo, tableInfoQueryKey } from "@core/filter";
import { AppDispatch } from "@store/store";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { PerspectivesActions } from "../store/perspectivesSlice";

const useGetPerspectivesFilterInfo = (projectId: number, dispatch: AppDispatch) =>
  useQuery<ColumnInfo[]>({
    queryKey: tableInfoQueryKey("perspectives", projectId),
    queryFn: async () => {
      const result = await SearchService.searchSdocInfo({ projectId });
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
      dispatch(PerspectivesActions.init({ columnInfoMap }));
      return columnInfo;
    },
    staleTime: Infinity,
  });

export const useInitPerspectivesFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetPerspectivesFilterInfo(projectId, dispatch);

  return columnData;
};
