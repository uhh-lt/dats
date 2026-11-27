import { TimelineAnalysesService } from "@api/services/TimelineAnalysesService";
import { TimelineAnalysisRead } from "@models/TimelineAnalysisRead";
import { useMutation } from "@tanstack/react-query";
import { timelineAnalysisQueries } from "./timelineAnalysisQueries";

const useCreateTimelineAnalysis = () =>
  useMutation({
    mutationKey: [...timelineAnalysisQueries.all(), "createTimelineAnalysis"],
    mutationFn: TimelineAnalysesService.create,
    meta: {
      datsEvent: "TIMELINE_ANALYSIS_CREATED",
      successMessage: (timeline: TimelineAnalysisRead) => `Created Timeline Analysis "${timeline.name}"`,
    },
  });

const useUpdateTimelineAnalysis = () =>
  useMutation({
    mutationKey: [...timelineAnalysisQueries.all(), "updateTimelineAnalysis"],
    mutationFn: TimelineAnalysesService.updateById,
    meta: {
      datsEvent: "TIMELINE_ANALYSIS_UPDATED",
      successMessage: (timeline: TimelineAnalysisRead) => `Updated Timeline Analysis "${timeline.name}"`,
    },
  });

const useRecomputeTimelineAnalysis = () =>
  useMutation({
    mutationKey: [...timelineAnalysisQueries.all(), "recomputeTimelineAnalysis"],
    mutationFn: TimelineAnalysesService.recompute,
    meta: {
      datsEvent: "TIMELINE_ANALYSIS_UPDATED",
      successMessage: (timeline: TimelineAnalysisRead) => `Recomputed Timeline Analysis "${timeline.name}"`,
    },
  });

const useDuplicateTimelineAnalysis = () =>
  useMutation({
    mutationKey: [...timelineAnalysisQueries.all(), "duplicateTimelineAnalysis"],
    mutationFn: TimelineAnalysesService.duplicate,
    meta: {
      datsEvent: "TIMELINE_ANALYSIS_CREATED",
      successMessage: (timeline: TimelineAnalysisRead) => `Duplicated Timeline Analysis "${timeline.name}"`,
    },
  });

const useDeleteTimelineAnalysis = () =>
  useMutation({
    mutationKey: [...timelineAnalysisQueries.all(), "deleteTimelineAnalysis"],
    mutationFn: TimelineAnalysesService.deleteById,
    meta: {
      datsEvent: "TIMELINE_ANALYSIS_DELETED",
      successMessage: (timeline: TimelineAnalysisRead) => `Deleted Timeline Analysis "${timeline.name}"`,
    },
  });

export const TimelineAnalysisHooks = {
  useCreateTimelineAnalysis,
  useUpdateTimelineAnalysis,
  useRecomputeTimelineAnalysis,
  useDuplicateTimelineAnalysis,
  useDeleteTimelineAnalysis,
};
