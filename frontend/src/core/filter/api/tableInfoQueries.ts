import type { ColumnInfo } from "../filterUtils";

/**
 * Keys of the table info (column infos of a filter table). The queries that fetch the column infos are leaves of the
 * domain factories (e.g. `sdocQueries.tableInfo`); they use these keys, so that the cache-sync code can invalidate all of them.
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

/** The search info endpoints return the column as an enum; the filter state uses plain strings. */
export const toColumnInfos = <T extends Omit<ColumnInfo, "column"> & { column: { toString(): string } }>(
  infos: T[],
): ColumnInfo[] => infos.map((info) => ({ ...info, column: info.column.toString() }));

/** The filter slices store the column infos as a map by column. */
export const toColumnInfoMap = (infos: ColumnInfo[]): Record<string, ColumnInfo> =>
  Object.fromEntries(infos.map((info) => [info.column, info]));
