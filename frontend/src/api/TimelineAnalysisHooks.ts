import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { TimelineAnalysisRead } from "./openapi/models/TimelineAnalysisRead.ts";
import { TimelineAnalysisService } from "./openapi/services/TimelineAnalysisService.ts";

const useGetTimelineAnalysis = (timelineAnalysisId: number | null | undefined) =>
  useQuery<TimelineAnalysisRead, Error>({
    queryKey: [QueryKey.TIMELINE_ANALYSIS, timelineAnalysisId],
    queryFn: async () => {
      return await TimelineAnalysisService.getById({ timelineAnalysisId: timelineAnalysisId! });
    },
    retry: false,
    enabled: !!timelineAnalysisId,
    select: (data) => data,
  });

const useGetUserTimelineAnalysiss = (projectId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<TimelineAnalysisRead[], Error>({
    queryKey: [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, projectId, userId],
    queryFn: async () => {
      return await TimelineAnalysisService.getByProjectAndUser({ projectId: projectId!, userId: userId! });
    },
    retry: false,
    enabled: !!projectId && !!userId,
  });

const useCreateTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.TIMELINE_ANALYSIS, data.id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id, data.user_id],
      });
    },
  });

const useUpdateTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.updateById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.TIMELINE_ANALYSIS, data.id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id, data.user_id],
      });
    },
  });

const useDeleteTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.TIMELINE_ANALYSIS, data.id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id, data.user_id],
      });
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
