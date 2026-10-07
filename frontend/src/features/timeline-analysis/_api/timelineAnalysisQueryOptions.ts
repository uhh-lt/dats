import { timelineAnalysisQueries } from "@api/queries/timelineAnalysisQueries";
import { TimelineAnalysisService } from "@api/services/TimelineAnalysisService";
import { TimelineAnalysisRead } from "@models/TimelineAnalysisRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useCreateTimelineAnalysis = () =>
  useMutation({
    mutationKey: [...timelineAnalysisQueries.all(), "createTimelineAnalysis"],
    mutationFn: TimelineAnalysisService.create,
    meta: {
      datsEvent: "TIMELINE_ANALYSIS_CREATED",
      successMessage: (timeline: TimelineAnalysisRead) => `Created Timeline Analysis "${timeline.name}"`,
    },
  });

export const useUpdateTimelineAnalysis = () =>
  useMutation({
    mutationKey: [...timelineAnalysisQueries.all(), "updateTimelineAnalysis"],
    mutationFn: TimelineAnalysisService.updateById,
    meta: {
      datsEvent: "TIMELINE_ANALYSIS_UPDATED",
      successMessage: (timeline: TimelineAnalysisRead) => `Updated Timeline Analysis "${timeline.name}"`,
    },
  });

export const useRecomputeTimelineAnalysis = () =>
  useMutation({
    mutationKey: [...timelineAnalysisQueries.all(), "recomputeTimelineAnalysis"],
    mutationFn: TimelineAnalysisService.recomputeById,
    meta: {
      datsEvent: "TIMELINE_ANALYSIS_UPDATED",
      successMessage: (timeline: TimelineAnalysisRead) => `Recomputed Timeline Analysis "${timeline.name}"`,
    },
  });

export const useDuplicateTimelineAnalysis = () =>
  useMutation({
    mutationKey: [...timelineAnalysisQueries.all(), "duplicateTimelineAnalysis"],
    mutationFn: TimelineAnalysisService.duplicateById,
    meta: {
      datsEvent: "TIMELINE_ANALYSIS_CREATED",
      successMessage: (timeline: TimelineAnalysisRead) => `Duplicated Timeline Analysis "${timeline.name}"`,
    },
  });

export const useDeleteTimelineAnalysis = () =>
  useMutation({
    mutationKey: [...timelineAnalysisQueries.all(), "deleteTimelineAnalysis"],
    mutationFn: TimelineAnalysisService.deleteById,
    meta: {
      datsEvent: "TIMELINE_ANALYSIS_DELETED",
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
    ...timelineAnalysisQueries.byProject(projectId),
    select: (data) => (analysisId != null ? data[analysisId] : undefined),
    enabled: analysisId != null,
  });
};

export const useGetProjectTimelineAnalysisList = () => {
  const projectId = useAppSelector((state) => state.project.projectId);

  return useQuery({
    ...timelineAnalysisQueries.byProject(projectId),
    select: (data) => Object.values(data),
  });
};
