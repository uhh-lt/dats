import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient";
import { QueryKey } from "./QueryKey";
import { TimelineAnalysisRead, TimelineAnalysisService } from "./openapi";

const useGetTimelineAnalysis = (timelineAnalysisId: number | null | undefined) =>
  useQuery<TimelineAnalysisRead, Error>(
    [QueryKey.TIMELINE_ANALYSIS, timelineAnalysisId],
    async () => {
      return await TimelineAnalysisService.getById({ timelineAnalysisId: timelineAnalysisId! });
    },
    {
      retry: false,
      enabled: !!timelineAnalysisId,
      select: (data) => data,
    },
  );

const useGetUserTimelineAnalysiss = (projectId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<TimelineAnalysisRead[], Error>(
    [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, projectId, userId],
    async () => {
      return await TimelineAnalysisService.getByProjectAndUser({ projectId: projectId!, userId: userId! });
    },
    {
      retry: false,
      enabled: !!projectId && !!userId,
    },
  );

const useCreateTimelineAnalysis = () =>
  useMutation(TimelineAnalysisService.create, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.TIMELINE_ANALYSIS, data.id]);
      queryClient.invalidateQueries([QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id, data.user_id]);
    },
  });

const useUpdateTimelineAnalysis = () =>
  useMutation(TimelineAnalysisService.updateById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.TIMELINE_ANALYSIS, data.id]);
      queryClient.invalidateQueries([QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id, data.user_id]);
    },
  });

const useDeleteTimelineAnalysis = () =>
  useMutation(TimelineAnalysisService.deleteById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.TIMELINE_ANALYSIS, data.id]);
      queryClient.invalidateQueries([QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id, data.user_id]);
    },
  });

const TimelineAnalysisHooks = {
  useGetTimelineAnalysis,
  useGetUserTimelineAnalysiss,
  useCreateTimelineAnalysis,
  useUpdateTimelineAnalysis,
  useDeleteTimelineAnalysis,
};

export default TimelineAnalysisHooks;
