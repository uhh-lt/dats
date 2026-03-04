import { SearchService } from "@api/services/SearchService";
import { ColumnInfo, tableInfoQueryKey } from "@components/filter";
import { useAppDispatch } from "@plugins/redux";
import { AppDispatch } from "@store/store";
import { useQuery } from "@tanstack/react-query";
import { SEATFilterActions } from "../seatFilterSlice";

const useGetSEATInfo = (projectId: number, dispatch: AppDispatch) =>
  useQuery<ColumnInfo[]>({
    queryKey: tableInfoQueryKey("seatFilter", projectId),
    queryFn: async () => {
      const result = await SearchService.searchSentenceAnnotationInfo({ projectId });
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
      dispatch(SEATFilterActions.init({ columnInfoMap }));
      return columnInfo;
    },
    staleTime: Infinity,
  });

export const useInitSEATFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetSEATInfo(projectId, dispatch);

  return columnData;
};
