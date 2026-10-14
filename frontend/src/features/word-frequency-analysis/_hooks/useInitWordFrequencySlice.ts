import { toColumnInfoMap } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { wordFrequencyQueries } from "../api/wordFrequencyQueries";
import { WordFrequencyActions } from "../store/wordFrequencySlice";

export const useInitWordFrequencySlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query); the slice is initialized as a side effect of fetching the column infos
  const { data: columnData } = useQuery(
    wordFrequencyQueries.tableInfo(projectId, (columnInfos) =>
      dispatch(WordFrequencyActions.init({ columnInfoMap: toColumnInfoMap(columnInfos) })),
    ),
  );

  return columnData;
};
