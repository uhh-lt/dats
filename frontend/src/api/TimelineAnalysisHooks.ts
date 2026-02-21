import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { TimelineAnalysisRead } from "./openapi/models/TimelineAnalysisRead.ts";
import { TimelineAnalysisService } from "./openapi/services/TimelineAnalysisService.ts";

// TIMELINE QUERIES

export type TimelineMap = Record<number, TimelineAnalysisRead>;

interface UseTimelineAnalysisQueryParams<T> {
  select?: (data: TimelineMap) => T;
  enabled?: boolean;
}

const useTimelinesQuery = <T = TimelineMap>({ select, enabled }: UseTimelineAnalysisQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_TIMELINE_ANALYSIS, projectId],
    queryFn: async () => {
      const data = await TimelineAnalysisService.getByProject({ projectId: projectId! });
      return data.reduce((acc, timeline) => {
        acc[timeline.id] = timeline;
        return acc;
      }, {} as TimelineMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
  });
};

const useGetTimelineAnalysis = (timelineAnalysisId: number | null | undefined) =>
  useTimelinesQuery({
    select: (data) => data[timelineAnalysisId!],
    enabled: !!timelineAnalysisId,
  });

const useGetProjectTimelineAnalysisList = () => useTimelinesQuery({ select: (data) => Object.values(data) });

// TIMELINE MUTATIONS
const useCreateTimelineAnalysis = () =>
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

const useUpdateTimelineAnalysis = () =>
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

const useRecomputeTimelineAnalysis = () =>
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

const useDuplicateTimelineAnalysis = () =>
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

const useDeleteTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.deleteById,
    onSuccess(data) {
      queryClient.setQueryData<TimelineMap>([QueryKey.PROJECT_TIMELINE_ANALYSIS, data.project_id], (prev) => {
        if (!prev) return prev;
        const newData = { ...prev };
        delete newData[data.id];
        return newData;
      });
    },
    meta: {
      successMessage: (timeline: TimelineAnalysisRead) => `Deleted Timeline Analysis "${timeline.name}"`,
    },
  });

export const TimelineAnalysisHooks = {
  useGetProjectTimelineAnalysisList,
  useGetTimelineAnalysis,
  useCreateTimelineAnalysis,
  useUpdateTimelineAnalysis,
  useRecomputeTimelineAnalysis,
  useDuplicateTimelineAnalysis,
  useDeleteTimelineAnalysis,
};
