import { SearchService } from "@api/services/SearchService";
import { TimelineAnalysisService } from "@api/services/TimelineAnalysisService";
import { tableInfoQueries, toColumnInfos } from "@core/filter";
import type { TimelineAnalysisRead } from "@models/TimelineAnalysisRead";
import { TimelineAnalysisType } from "@models/TimelineAnalysisType";
import { queryOptions } from "@tanstack/react-query";

export type TimelineMap = Record<number, TimelineAnalysisRead>;

/**
 * Query factory for timeline analyses.
 *
 *   timelineAnalysisQueries.all()                    ["timelineAnalysis"]
 *   timelineAnalysisQueries.projectScope(projectId)  ["timelineAnalysis", "project", projectId]
 *   timelineAnalysisQueries.byProject(projectId)     ["timelineAnalysis", "project", projectId]
 *   timelineAnalysisQueries.tableInfo(timeline)    the column infos of the filter (they depend on the type)
 */
export const timelineAnalysisQueries = {
  all: () => ["timelineAnalysis"] as const,
  // prefix of all timeline analysis queries of one project
  projectScope: (projectId: number) => [...timelineAnalysisQueries.all(), "project", projectId] as const,

  // all timeline analyses of a project, as a map by id
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: timelineAnalysisQueries.projectScope(projectId),
      queryFn: async () => {
        const data = await TimelineAnalysisService.getByProject({ projectId });
        return data.reduce<TimelineMap>((acc, timeline) => {
          acc[timeline.id] = timeline;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),

  // the column infos of the filter of one timeline analysis; they depend on its type
  tableInfo: (timelineAnalysis: TimelineAnalysisRead) => {
    const { project_id: projectId, timeline_analysis_type: type, id } = timelineAnalysis;
    return queryOptions({
      queryKey: tableInfoQueries.timeline(projectId, type, id),
      queryFn: async () => {
        switch (type) {
          case TimelineAnalysisType.DOCUMENT:
            return toColumnInfos(await SearchService.searchSdocInfo({ projectId }));
          case TimelineAnalysisType.BBOX_ANNOTATION:
            return toColumnInfos(await SearchService.searchBboxAnnotationInfo({ projectId }));
          case TimelineAnalysisType.SENTENCE_ANNOTATION:
            return toColumnInfos(await SearchService.searchSentenceAnnotationInfo({ projectId }));
          case TimelineAnalysisType.SPAN_ANNOTATION:
            return toColumnInfos(await SearchService.searchSpanAnnotationInfo({ projectId }));
          default:
            return [];
        }
      },
      staleTime: Infinity,
    });
  },
};
