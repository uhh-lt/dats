import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "../../../api/QueryKey";
import {
  AnalysisService,
  AnnotatedSegmentResult,
  AnnotatedSegmentsColumns,
  LogicalOperator,
  SortDirection,
} from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { MyFilter } from "../../../features/FilterDialog/filterUtils";

export const useAnnotatedSegmentQuery = (projectId: number | undefined) => {
  const userIds = useAppSelector((state) => state.annotatedSegments.selectedUserIds);
  const paginationModel = useAppSelector((state) => state.annotatedSegments.paginationModel);
  const sortModel = useAppSelector((state) => state.annotatedSegments.sortModel);
  const filter = useAppSelector((state) => state.annotatedSegmentsFilter.filter["root"]);

  return useQuery<AnnotatedSegmentResult, Error>(
    [
      QueryKey.ANALYSIS_ANNOTATED_SEGMENTS,
      projectId,
      userIds,
      filter,
      paginationModel.page,
      paginationModel.pageSize,
      sortModel,
    ],
    () =>
      AnalysisService.annotatedSegments({
        projectId: projectId!,
        requestBody: {
          filter: filter as MyFilter<AnnotatedSegmentsColumns>,
          user_ids: userIds,
          sorts: sortModel
            .filter((sort) => sort.sort)
            .map((sort) => ({ column: sort.field as AnnotatedSegmentsColumns, direction: sort.sort as SortDirection })),
        },
        page: paginationModel.page,
        pageSize: paginationModel.pageSize,
      }),
    {
      enabled: !!projectId && userIds.length > 0,
      keepPreviousData: true, // see https://tanstack.com/query/v4/docs/react/guides/paginated-queries
    },
  );
};

export const useAllAnnotatedSegmentsQuery = (
  projectId: number | undefined,
  onSuccess: (data: AnnotatedSegmentResult) => void,
) => {
  const userIds = useAppSelector((state) => state.annotatedSegments.selectedUserIds);

  return useQuery<AnnotatedSegmentResult, Error>(
    [QueryKey.ANALYSIS_ANNOTATED_SEGMENTS, projectId, userIds, {}, 0, 1000, []],
    () =>
      AnalysisService.annotatedSegments({
        projectId: projectId!,
        requestBody: {
          filter: {
            items: [],
            logic_operator: LogicalOperator.AND,
          },
          user_ids: userIds,
          sorts: [],
        },
        page: 0,
        pageSize: 1000,
      }),
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      enabled: false,
      onSuccess: onSuccess,
    },
  );
};
