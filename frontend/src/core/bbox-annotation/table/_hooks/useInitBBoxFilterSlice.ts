import { toColumnInfoMap } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { bboxAnnotationQueries } from "../../api/bboxAnnotationQueries";
import { BBoxFilterActions } from "../bboxFilterSlice";

export const useInitBBoxFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query); the slice is initialized as a side effect of fetching the column infos
  const { data: columnData } = useQuery(
    bboxAnnotationQueries.tableInfo(projectId, (columnInfos) =>
      dispatch(BBoxFilterActions.init({ columnInfoMap: toColumnInfoMap(columnInfos) })),
    ),
  );

  return columnData;
};
