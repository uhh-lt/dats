import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "../../../api/QueryKey";
import { AnalysisService, AnnotatedSegmentResult } from "../../../api/openapi";
import { useFilterSliceSelector } from "../../../features/FilterDialog/FilterProvider";
import { useAppSelector } from "../../../plugins/ReduxHooks";

export const useAnnotatedSegmentQuery = (projectId: number | undefined) => {
  const userIds = useAppSelector((state) => state.annotatedSegments.selectedUserIds);
  const paginationModel = useAppSelector((state) => state.annotatedSegments.paginationModel);
  const filter = useFilterSliceSelector().filter["root"];

  return useQuery<AnnotatedSegmentResult, Error>(
    [QueryKey.ANALYSIS_ANNOTATED_SEGMENTS, projectId, userIds, filter, paginationModel.page, paginationModel.pageSize],
    () =>
      AnalysisService.annotatedSegments({
        projectId: projectId!,
        requestBody: {
          filter: filter,
          user_ids: userIds,
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
