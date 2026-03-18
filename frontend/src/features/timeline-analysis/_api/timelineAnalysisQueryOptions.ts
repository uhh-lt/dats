import { QueryKey } from "@api/hooks/QueryKey";
import { TimelineAnalysisRead } from "@api/models/TimelineAnalysisRead";
import { queryClient } from "@api/queryClient";
import { TimelineAnalysisService } from "@api/services/TimelineAnalysisService";
import { useAppSelector } from "@store/storeHooks";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

export type TimelineMap = Record<number, TimelineAnalysisRead>;

export const projectTimelineAnalysisQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_TIMELINE_ANALYSIS, projectId],
    queryFn: async () => {
      const data = await TimelineAnalysisService.getByProject({ projectId });
      return data.reduce((acc, timeline) => {
        acc[timeline.id] = timeline;
        return acc;
      }, {} as TimelineMap);
    },
    staleTime: 1000 * 60 * 5,
  });

export const useCreateTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.create,
    onSuccess(data) {
      queryClient.setQueryData<TimelineMap>([QueryKey.PROJECT_TIMELINE_ANALYSIS, data.project_id], (prev) =>
        prev ? { ...prev, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (timeline: TimelineAnalysisRead) => `Created Timeline Analysis "${timeline.name}"`,
    },
  });

export const useUpdateTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.updateById,
    onSuccess(data) {
      queryClient.setQueryData<TimelineMap>([QueryKey.PROJECT_TIMELINE_ANALYSIS, data.project_id], (prev) =>
        prev ? { ...prev, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (timeline: TimelineAnalysisRead) => `Updated Timeline Analysis "${timeline.name}"`,
    },
  });

export const useRecomputeTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.recomputeById,
    onSuccess(data) {
      queryClient.setQueryData<TimelineMap>([QueryKey.PROJECT_TIMELINE_ANALYSIS, data.project_id], (prev) =>
        prev ? { ...prev, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (timeline: TimelineAnalysisRead) => `Recomputed Timeline Analysis "${timeline.name}"`,
    },
  });

export const useDuplicateTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.duplicateById,
    onSuccess(data) {
      queryClient.setQueryData<TimelineMap>([QueryKey.PROJECT_TIMELINE_ANALYSIS, data.project_id], (prev) =>
        prev ? { ...prev, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (timeline: TimelineAnalysisRead) => `Duplicated Timeline Analysis "${timeline.name}"`,
    },
  });

export const useDeleteTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.deleteById,
    onSuccess(data) {
      queryClient.setQueryData<TimelineMap>([QueryKey.PROJECT_TIMELINE_ANALYSIS, data.project_id], (prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[data.id];
        return next;
      });
    },
    meta: {
      successMessage: (timeline: TimelineAnalysisRead) => `Deleted Timeline Analysis "${timeline.name}"`,
    },
  });

/**
 * Convenience hook for components that need a single timeline analysis by ID but have no route context.
 * For route-backed components, use useSuspenseQuery with projectTimelineAnalysisQueryOptions directly.
 */
export const useGetTimelineAnalysisById = (analysisId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);

  return useQuery({
    ...projectTimelineAnalysisQueryOptions(projectId!),
    select: (data) => (analysisId != null ? data[analysisId] : undefined),
    enabled: !!projectId && analysisId != null,
  });
};

export const useGetProjectTimelineAnalysisList = () => {
  const projectId = useAppSelector((state) => state.project.projectId);

  return useQuery({
    ...projectTimelineAnalysisQueryOptions(projectId!),
    select: (data) => Object.values(data),
    enabled: !!projectId,
  });
};
