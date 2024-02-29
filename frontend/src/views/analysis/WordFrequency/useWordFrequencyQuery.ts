import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { QueryKey } from "../../../api/QueryKey.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { WordFrequencyColumns } from "../../../api/openapi/models/WordFrequencyColumns.ts";
import { WordFrequencyResult } from "../../../api/openapi/models/WordFrequencyResult.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { MyFilter } from "../../../features/FilterDialog/filterUtils.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

export const useWordFrequencyQuery = (projectId: number | undefined) => {
  const paginationModel = useAppSelector((state) => state.wordFrequency.paginationModel);
  const sortingModel = useAppSelector((state) => state.wordFrequency.sortingModel);
  const filter = useAppSelector((state) => state.wordFrequencyFilter.filter["root"]);

  return useQuery<WordFrequencyResult, Error>({
    queryKey: [
      QueryKey.ANALYSIS_WORD_FREQUENCY,
      projectId,
      filter,
      paginationModel.pageIndex,
      paginationModel.pageSize,
      sortingModel,
    ],
    queryFn: () =>
      AnalysisService.wordFrequencyAnalysis({
        projectId: projectId!,
        page: paginationModel.pageIndex,
        pageSize: paginationModel.pageSize,
        requestBody: {
          filter: filter as MyFilter<WordFrequencyColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as WordFrequencyColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
      }),
    enabled: !!projectId,
    placeholderData: keepPreviousData,
  });
};
