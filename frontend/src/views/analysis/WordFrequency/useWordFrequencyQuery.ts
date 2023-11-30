import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "../../../api/QueryKey";
import { AnalysisService, SortDirection, WordFrequencyColumns, WordFrequencyResult } from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { MyFilter } from "../../../features/FilterDialog/filterUtils";

export const useWordFrequencyQuery = (projectId: number | undefined) => {
  const paginationModel = useAppSelector((state) => state.wordFrequency.paginationModel);
  const sortModel = useAppSelector((state) => state.wordFrequency.sortModel);
  const filter = useAppSelector((state) => state.wordFrequencyFilter.filter["root"]);

  return useQuery<WordFrequencyResult, Error>(
    [QueryKey.ANALYSIS_WORD_FREQUENCY, projectId, filter, paginationModel.page, paginationModel.pageSize, sortModel],
    () =>
      AnalysisService.wordFrequencyAnalysis({
        projectId: projectId!,
        page: paginationModel.page,
        pageSize: paginationModel.pageSize,
        requestBody: {
          filter: filter as MyFilter<WordFrequencyColumns>,
          sorts: sortModel
            .filter((sort) => sort.sort)
            .map((sort) => ({ column: sort.field as WordFrequencyColumns, direction: sort.sort as SortDirection })),
        },
      }),
    {
      enabled: !!projectId,
      keepPreviousData: true, // see https://tanstack.com/query/v4/docs/react/guides/paginated-queries
    },
  );
};
