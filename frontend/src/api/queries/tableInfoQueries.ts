/**
 * Keys of the table info (column infos of a filter table). Every filter slice fetches its own
 * column info with its own `queryFn`, so this factory only provides keys.
 *
 *   tableInfoQueries.all()                       ["tableInfo"]
 *   tableInfoQueries.bySlice(sliceName, projId)  ["tableInfo", sliceName, projId]
 */
export const tableInfoQueries = {
  all: () => ["tableInfo"] as const,
  bySlice: (sliceName: string, projectId: number) => [...tableInfoQueries.all(), sliceName, projectId] as const,
};
