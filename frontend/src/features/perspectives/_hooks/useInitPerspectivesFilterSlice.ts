import { toColumnInfoMap } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { perspectiveQueries } from "../api/perspectiveQueries";
import { PerspectivesActions } from "../store/perspectivesSlice";

export const useInitPerspectivesFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query); the slice is initialized as a side effect of fetching the column infos
  const { data: columnData } = useQuery(
    perspectiveQueries.tableInfo(projectId, (columnInfos) =>
      dispatch(PerspectivesActions.init({ columnInfoMap: toColumnInfoMap(columnInfos) })),
    ),
  );

  return columnData;
};
