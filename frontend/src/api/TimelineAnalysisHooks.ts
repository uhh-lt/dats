import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { TimelineAnalysisRead } from "./openapi/models/TimelineAnalysisRead.ts";
import { TimelineAnalysisService } from "./openapi/services/TimelineAnalysisService.ts";

const useGetTimelineAnalysis = (timelineAnalysisId: number | null | undefined) =>
  useQuery<TimelineAnalysisRead, Error>({
    queryKey: [QueryKey.TIMELINE_ANALYSIS, timelineAnalysisId],
    queryFn: () => TimelineAnalysisService.getById({ timelineAnalysisId: timelineAnalysisId! }),
    retry: false,
    enabled: !!timelineAnalysisId,
    select: (data) => data,
  });

const useGetUserTimelineAnalysis = (projectId: number | null | undefined) =>
  useQuery<TimelineAnalysisRead[], Error>({
    queryKey: [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, projectId],
    queryFn: () => TimelineAnalysisService.getByProjectAndUser({ projectId: projectId! }),
    retry: false,
    enabled: !!projectId,
  });

const useCreateTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.create,
    onSuccess(data) {
      if (data) {
        queryClient.setQueryData<TimelineAnalysisRead[]>(
          [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id],
          (prevTimelineAnalysis) => {
            if (!prevTimelineAnalysis) return [data];
            return [...prevTimelineAnalysis, data];
          },
        );
        queryClient.invalidateQueries({ queryKey: [QueryKey.TIMELINE_ANALYSIS, data.id] });
        queryClient.invalidateQueries({
          queryKey: [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id],
        });
      }
    },
  });

const useUpdateTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.updateById,
    onSettled(data, _error, variables) {
      if (data) {
        // optimistic update of TIMELINE_ANALYSIS_PROJECT_USER
        queryClient.setQueryData<TimelineAnalysisRead[]>(
          [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id],
          (prevTimelineAnalysis) => {
            if (!prevTimelineAnalysis) return [data];
            const index = prevTimelineAnalysis.findIndex((timelineAnalysis) => timelineAnalysis.id === data.id);
            if (index === -1) {
              return prevTimelineAnalysis;
            }
            return [...prevTimelineAnalysis.slice(0, index), data, ...prevTimelineAnalysis.slice(index + 1)];
          },
        );
        queryClient.invalidateQueries({
          queryKey: [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id],
        });

        // optimistic update of TIMELINE_ANALYSIS
        queryClient.setQueryData<TimelineAnalysisRead>([QueryKey.TIMELINE_ANALYSIS, data.id], data);
      }
      queryClient.invalidateQueries({ queryKey: [QueryKey.TIMELINE_ANALYSIS, variables.timelineAnalysisId] });
    },
  });

const useDuplicateTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.duplicateById,
    onSettled(data) {
      if (data) {
        queryClient.setQueryData<TimelineAnalysisRead[]>(
          [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id],
          (prevTimelineAnalysis) => {
            if (!prevTimelineAnalysis) return [data];
            return [...prevTimelineAnalysis, data];
          },
        );
        queryClient.invalidateQueries({
          queryKey: [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id],
        });
      }
    },
  });

const useDeleteTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.deleteById,
    onSettled(data, _error, variables) {
      if (data) {
        queryClient.setQueryData<TimelineAnalysisRead[]>(
          [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id],
          (prevTimelineAnalysis) => {
            if (!prevTimelineAnalysis) return [];
            return prevTimelineAnalysis.filter((timelineAnalysis) => timelineAnalysis.id !== data.id);
          },
        );
        queryClient.invalidateQueries({
          queryKey: [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id],
        });
      }
      queryClient.invalidateQueries({ queryKey: [QueryKey.TIMELINE_ANALYSIS, variables.timelineAnalysisId] });
    },
  });

const TimelineAnalysisHooks = {
  useGetTimelineAnalysis,
  useGetUserTimelineAnalysiss: useGetUserTimelineAnalysis,
  useCreateTimelineAnalysis,
  useUpdateTimelineAnalysis,
  useDuplicateTimelineAnalysis,
  useDeleteTimelineAnalysis,
};

export default TimelineAnalysisHooks;
