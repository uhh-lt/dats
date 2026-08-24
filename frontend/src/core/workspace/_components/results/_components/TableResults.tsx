import { Alert, CircularProgress } from "@mui/material";
import { ReactNode } from "react";
import { EntityWorkspaceConfig } from "../../../types/EntityWorkspaceConfig";
import { WorkspaceView } from "../../../types/WorkspaceGeneratedTypes";
// eslint-disable-next-line local/no-scope-violations
import { TableLayout } from "../../table-layout/TableLayout";

const PAGE_SIZE = 50;
const GROUPS_PAGE_SIZE = 100;

interface TableResultsProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  projectId: number;
  view: WorkspaceView<TColumns>;
  searchQuery: string;
  onSelect: (id: number) => void;
  expandedGroups?: Record<number, string[]>;
  onToggleGroup: (viewId: number, groupKey: string, expanded: boolean, allGroupKeys: string[]) => void;
  columnSizing?: Record<number, Record<string, number>>;
  onColumnSizingChange: (viewId: number, columnSizing: Record<string, number>) => void;
}

/**
 * Fetches the data for the TABLE layout and renders the single flat Material React Table.
 * Grouped views fetch the group list (rows are fetched lazily per expanded group inside the
 * table); ungrouped views fetch the flat row list.
 */
export function TableResults<TColumns extends string, TRow extends { id: number }>({
  config,
  projectId,
  view,
  searchQuery,
  onSelect,
  expandedGroups,
  onToggleGroup,
  columnSizing,
  onColumnSizingChange,
}: TableResultsProps<TColumns, TRow>): ReactNode {
  const isGrouped = Boolean(view.group_by);
  return isGrouped ? (
    <GroupedTableResults
      config={config}
      projectId={projectId}
      view={view}
      searchQuery={searchQuery}
      onSelect={onSelect}
      expandedGroups={expandedGroups}
      onToggleGroup={onToggleGroup}
      columnSizing={columnSizing}
      onColumnSizingChange={onColumnSizingChange}
    />
  ) : (
    <UngroupedTableResults
      config={config}
      projectId={projectId}
      view={view}
      searchQuery={searchQuery}
      onSelect={onSelect}
      onToggleGroup={onToggleGroup}
      columnSizing={columnSizing}
      onColumnSizingChange={onColumnSizingChange}
    />
  );
}

function GroupedTableResults<TColumns extends string, TRow extends { id: number }>({
  config,
  projectId,
  view,
  searchQuery,
  onSelect,
  expandedGroups,
  onToggleGroup,
  columnSizing,
  onColumnSizingChange,
}: TableResultsProps<TColumns, TRow>): ReactNode {
  const groupBy = view.group_by;
  const query = config.useQueryGroups(
    {
      project_id: projectId,
      search_query: searchQuery,
      filter: view.filters,
      group_by: groupBy ?? { field: config.columns[Object.keys(config.columns)[0] as TColumns] },
      page_size: GROUPS_PAGE_SIZE,
    },
    Boolean(groupBy),
  );
  const groups = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (query.isLoading) return <CircularProgress sx={{ m: 2 }} />;
  if (query.isError)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {query.error.message}
      </Alert>
    );
  return (
    <TableLayout
      config={config}
      projectId={projectId}
      view={view}
      searchQuery={searchQuery}
      onSelect={onSelect}
      groups={groups}
      expandedGroupKeys={expandedGroups?.[view.id]}
      onToggleGroup={(groupKey, expanded, allGroupKeys) => onToggleGroup(view.id, groupKey, expanded, allGroupKeys)}
      columnSizing={columnSizing?.[view.id]}
      onColumnSizingChange={(sizing) => onColumnSizingChange(view.id, sizing)}
    />
  );
}

function UngroupedTableResults<TColumns extends string, TRow extends { id: number }>({
  config,
  projectId,
  view,
  searchQuery,
  onSelect,
  onToggleGroup,
  columnSizing,
  onColumnSizingChange,
}: TableResultsProps<TColumns, TRow>): ReactNode {
  const query = config.useQueryRows(
    {
      project_id: projectId,
      search_query: searchQuery,
      filter: view.filters,
      sorts: view.sorts,
      group_by: view.group_by,
      group_key: undefined,
      page_size: PAGE_SIZE,
    },
    true,
  );
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const totalResults = query.data?.pages?.[0]?.total_results ?? 0;
  if (query.isLoading) return <CircularProgress sx={{ m: 2 }} />;
  if (query.isError)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {query.error.message}
      </Alert>
    );
  return (
    <TableLayout
      config={config}
      projectId={projectId}
      view={view}
      searchQuery={searchQuery}
      onSelect={onSelect}
      rows={rows}
      onToggleGroup={(groupKey, expanded, allGroupKeys) => onToggleGroup(view.id, groupKey, expanded, allGroupKeys)}
      fetchNextPage={query.fetchNextPage}
      isFetching={query.isFetching}
      totalFetched={rows.length}
      totalResults={totalResults}
      columnSizing={columnSizing?.[view.id]}
      onColumnSizingChange={(sizing) => onColumnSizingChange(view.id, sizing)}
    />
  );
}
