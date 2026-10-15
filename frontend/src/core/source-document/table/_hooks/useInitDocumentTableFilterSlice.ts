import { toColumnInfoMap } from "@core/filter";
import { useAppDispatch } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { sdocQueries } from "../../api/sdocQueries";
import { SdocTableFilterActions } from "../sdocTableFilterSlice";

export const useInitDocumentTableFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query); the slice is initialized as a side effect of fetching the column infos
  const { data: columnData } = useQuery(
    sdocQueries.tableInfo(projectId, "documentTable", (columnInfos) =>
      dispatch(SdocTableFilterActions.init({ columnInfoMap: toColumnInfoMap(columnInfos) })),
    ),
  );

  return columnData;
};
