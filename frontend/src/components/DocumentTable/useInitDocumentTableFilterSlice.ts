import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { SearchService } from "../../api/openapi/services/SearchService.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { DocumentTableFilterActions } from "./documentTableFilterSlice.ts";

const useGetSearchInfo = (projectId: number) =>
  useQuery({
    queryKey: ["tableInfo", "documentTable", projectId],
    queryFn: () => SearchService.searchSdocsInfo({ projectId }),
  });

export const useInitDocumentTableFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const tableInfo = useGetSearchInfo(projectId);

  // effects
  useEffect(() => {
    if (!tableInfo.data) return;
    dispatch(
      DocumentTableFilterActions.init({
        columnInfo: tableInfo.data.map((d) => {
          return { ...d, column: d.column.toString() };
        }),
      }),
    );
    console.log("initialized document table filterSlice!");
  }, [dispatch, tableInfo.data]);

  return tableInfo;
};
