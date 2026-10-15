import { SearchService } from "@api/services/SearchService";
import { TimelineAnalysisService } from "@api/services/TimelineAnalysisService";
import { type ColumnInfo, tableInfoQueries, toColumnInfos } from "@core/filter";
import type { TimelineAnalysisRead } from "@models/TimelineAnalysisRead";
import { TimelineAnalysisType } from "@models/TimelineAnalysisType";
import { queryOptions } from "@tanstack/react-query";

export type TimelineMap = Record<number, TimelineAnalysisRead>;

/**
 * Query factory for timeline analyses.
 *
 *   timelineAnalysisQueries.all()                  ["timelineAnalyses"]
 *   timelineAnalysisQueries.byProject(projectId)   ["timelineAnalyses", "project", projectId]
 *   timelineAnalysisQueries.tableInfo(timeline)    the column infos of the filter (they depend on the type)
 */
export const timelineAnalysisQueries = {
  all: () => ["timelineAnalyses"] as const,

  // all timeline analyses of a project, as a map by id
  byProjectScope: () => [...timelineAnalysisQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...timelineAnalysisQueries.byProjectScope(), projectId] as const,
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
  tableInfo: (timelineAnalysis: TimelineAnalysisRead, onLoaded?: (columnInfos: ColumnInfo[]) => void) => {
    const { project_id: projectId, timeline_analysis_type: type, id } = timelineAnalysis;
    return queryOptions({
      queryKey: tableInfoQueries.timeline(projectId, type, id),
      queryFn: async () => {
        let columnInfos: ColumnInfo[] = [];
        switch (type) {
          case TimelineAnalysisType.DOCUMENT:
            columnInfos = toColumnInfos(await SearchService.searchSdocInfo({ projectId }));
            break;
          case TimelineAnalysisType.BBOX_ANNOTATION:
            columnInfos = toColumnInfos(await SearchService.searchBboxAnnotationInfo({ projectId }));
            break;
          case TimelineAnalysisType.SENTENCE_ANNOTATION:
            columnInfos = toColumnInfos(await SearchService.searchSentenceAnnotationInfo({ projectId }));
            break;
          case TimelineAnalysisType.SPAN_ANNOTATION:
            columnInfos = toColumnInfos(await SearchService.searchSpanAnnotationInfo({ projectId }));
            break;
        }
        onLoaded?.(columnInfos);
        return columnInfos;
      },
      staleTime: Infinity,
    });
  },
};
