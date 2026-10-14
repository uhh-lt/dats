import { toColumnInfoMap } from "@core/filter";
import { sdocQueries } from "@core/source-document";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { SearchActions } from "../store/documentSearchSlice";

export const useInitSearchFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query); the slice is initialized as a side effect of fetching the column infos
  const { data: columnData } = useQuery(
    sdocQueries.search.tableInfo(projectId, (columnInfos) =>
      dispatch(SearchActions.init({ columnInfoMap: toColumnInfoMap(columnInfos) })),
    ),
  );

  return columnData;
};
