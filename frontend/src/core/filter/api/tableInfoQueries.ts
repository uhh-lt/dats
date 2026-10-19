import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";
import type { ColumnInfo } from "../filterUtils";

/** The query options of a `<domain>Queries.tableInfo(...)` leaf: what a filter dialog needs to load the column infos. */
export type TableInfoOptions = UseQueryOptions<ColumnInfo[], Error, ColumnInfo[], QueryKey>;

/**
 * Keys of the table info (column infos of a filter table). The queries that fetch the column infos are leaves of the
 * domain factories (e.g. `sdocQueries.tableInfo`); they use these keys, so that the cache-sync code can invalidate all of them.
 *
 *   tableInfoQueries.all()                       ["tableInfo"]
 *   tableInfoQueries.byDomain(domain, projId)    ["tableInfo", domain, projId]
 *   tableInfoQueries.timeline(projId, type, id)  ["tableInfo", "timelineAnalysis", projId, type, id]
 */
export const tableInfoQueries = {
  all: () => ["tableInfo"] as const,
  // typed as a plain QueryKey, so that all tableInfo leaves have the same options type (TableInfoOptions)
  byDomain: (domain: string, projectId: number): QueryKey => [...tableInfoQueries.all(), domain, projectId],
  // the column infos of one timeline analysis (they depend on its type)
  timeline: (projectId: number, timelineAnalysisType: string, timelineAnalysisId: number): QueryKey => [
    ...tableInfoQueries.byDomain("timelineAnalysis", projectId),
    timelineAnalysisType,
    timelineAnalysisId,
  ],
};
