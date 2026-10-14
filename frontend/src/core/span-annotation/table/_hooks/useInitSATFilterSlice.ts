import { toColumnInfoMap } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { spanAnnotationQueries } from "../../api/spanAnnotationQueries";
import { SATFilterActions } from "../satFilterSlice";

export const useInitSATFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query); the slice is initialized as a side effect of fetching the column infos
  const { data: columnData } = useQuery(
    spanAnnotationQueries.tableInfo(projectId, (columnInfos) =>
      dispatch(SATFilterActions.init({ columnInfoMap: toColumnInfoMap(columnInfos) })),
    ),
  );

  return columnData;
};
