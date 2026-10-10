/**
 * Keys of the table info (column infos of a filter table). Every filter slice fetches its own
 * column info with its own `queryFn`, so this factory only provides keys.
 *
 *   tableInfoQueries.all()                       ["tableInfo"]
 *   tableInfoQueries.bySlice(sliceName, projId)  ["tableInfo", sliceName, projId]
 *   tableInfoQueries.timeline(projId, type, id)  ["tableInfo", "timelineAnalysis", projId, type, id]
 */
export const tableInfoQueries = {
  all: () => ["tableInfo"] as const,
  bySlice: (sliceName: string, projectId: number) => [...tableInfoQueries.all(), sliceName, projectId] as const,
  // the column infos of one timeline analysis (they depend on its type)
  timeline: (projectId: number, timelineAnalysisType: string, timelineAnalysisId: number) =>
    [...tableInfoQueries.bySlice("timelineAnalysis", projectId), timelineAnalysisType, timelineAnalysisId] as const,
};
