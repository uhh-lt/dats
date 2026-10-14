import { toColumnInfoMap } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { memoQueries } from "../../api/memoQueries";
import { MemoFilterActions } from "../memoFilterSlice";

export const useInitMemoFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query); the slice is initialized as a side effect of fetching the column infos
  const { data: columnData } = useQuery(
    memoQueries.tableInfo(projectId, (columnInfos) =>
      dispatch(MemoFilterActions.init({ columnInfoMap: toColumnInfoMap(columnInfos) })),
    ),
  );

  return columnData;
};
