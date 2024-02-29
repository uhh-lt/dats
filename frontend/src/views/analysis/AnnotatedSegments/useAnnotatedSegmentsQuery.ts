import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "../../../api/QueryKey.ts";

import { AnnotatedSegmentResult } from "../../../api/openapi/models/AnnotatedSegmentResult.ts";
import { AnnotatedSegmentsColumns } from "../../../api/openapi/models/AnnotatedSegmentsColumns.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { MyFilter } from "../../../features/FilterDialog/filterUtils.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

export const useAnnotatedSegmentQuery = (projectId: number | undefined) => {
  const userIds = useAppSelector((state) => state.annotatedSegments.selectedUserIds);
  const { pageIndex, pageSize } = useAppSelector((state) => state.annotatedSegments.paginationModel);
  const sortModel = useAppSelector((state) => state.annotatedSegments.sortModel);
  const filter = useAppSelector((state) => state.annotatedSegmentsFilter.filter["root"]);

  return useQuery<AnnotatedSegmentResult, Error>({
    queryKey: [QueryKey.ANALYSIS_ANNOTATED_SEGMENTS, projectId, userIds, filter, pageIndex, pageSize, sortModel],
    queryFn: () =>
      AnalysisService.annotatedSegments({
        projectId: projectId!,
        requestBody: {
          filter: filter as MyFilter<AnnotatedSegmentsColumns>,
          user_ids: userIds,
          sorts: sortModel.map((sort) => ({
            column: sort.id as AnnotatedSegmentsColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        page: pageIndex,
        pageSize: pageSize,
      }),
    enabled: !!projectId && userIds.length > 0,
  });
};
