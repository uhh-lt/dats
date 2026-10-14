import { toColumnInfoMap } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { sentenceAnnotationQueries } from "../../api/sentenceAnnotationQueries";
import { SEATFilterActions } from "../seatFilterSlice";

export const useInitSEATFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query); the slice is initialized as a side effect of fetching the column infos
  const { data: columnData } = useQuery(
    sentenceAnnotationQueries.tableInfo(projectId, (columnInfos) =>
      dispatch(SEATFilterActions.init({ columnInfoMap: toColumnInfoMap(columnInfos) })),
    ),
  );

  return columnData;
};
