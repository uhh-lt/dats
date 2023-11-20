import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { SearchService } from "../../api/openapi";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import { SearchFilterActions } from "./searchFilterSlice";

const useGetSearchInfo = (projectId: number) =>
  useQuery(["tableInfo", "search", projectId], () => SearchService.searchSdocsNewInfo({ projectId }));

export const useInitSearchFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const tableInfo = useGetSearchInfo(projectId);

  // effects
  useEffect(() => {
    if (!tableInfo.data) return;
    dispatch(
      SearchFilterActions.init({
        columnInfo: tableInfo.data.map((d) => {
          return { ...d, column: d.column.toString() };
        }),
      }),
    );
    console.log("initialized search filterSlice!");
  }, [dispatch, tableInfo.data]);

  return tableInfo;
};
