import { useInfiniteScrollSentinel } from "@hooks/useInfiniteScrollSentinel";
import { Alert, CircularProgress, Stack } from "@mui/material";
import { ReactNode } from "react";
import { EntityWorkspaceConfig } from "../../../types/EntityWorkspaceConfig";
import { WorkspaceView } from "../../../types/WorkspaceGeneratedTypes";
// eslint-disable-next-line local/no-scope-violations
import { WorkspaceResultLayout } from "../../result-layout/WorkspaceResultLayout";

const PAGE_SIZE = 50;

interface EntityResultListProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  projectId: number;
  view: WorkspaceView<TColumns>;
  searchQuery: string;
  onSelect: (id: number) => void;
  groupKey?: string;
  /** Whether the rows query should execute. Defaults to true. */
  enabled?: boolean;
  /**
   * Whether this list owns a vertical scroll container. True for the top-level (ungrouped) list
   * and for board lanes (each lane scrolls independently); false for collapsible groups, where the
   * outer GroupedResults stack owns scrolling. Defaults to true.
   */
  scrollable?: boolean;
}

/** Fetches the rows of a view (optionally within a group) and renders them in the view's layout. */
export function EntityResultList<TColumns extends string, TRow extends { id: number }>({
  config,
  projectId,
  view,
  searchQuery,
  onSelect,
  groupKey,
  enabled,
  scrollable = true,
}: EntityResultListProps<TColumns, TRow>): ReactNode {
  const query = config.useQueryRows(
    {
      project_id: projectId,
      search_query: searchQuery,
      filter: view.filters,
      sorts: view.sorts,
      group_by: view.group_by,
      group_key: groupKey,
      page_size: PAGE_SIZE,
    },
    enabled,
  );
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedProperties = view.selected_properties ?? config.defaultSelectedProperties;
  const sentinelRef = useInfiniteScrollSentinel({
    hasNextPage: query.hasNextPage,
    isFetching: query.isFetching,
    fetchNextPage: query.fetchNextPage,
  });
  if (query.isLoading) return <CircularProgress sx={{ m: 2 }} />;
  if (query.isError)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {query.error.message}
      </Alert>
    );
  // Only a scrollable list owns a scroll container. Non-scrollable (collapsible-group) lists stay
  // unbounded so the outer GroupedResults stack scrolls and the virtualizer / infinite-scroll
  // sentinel resolve to that outer scroller.
  return (
    <Stack minHeight={0} overflow={scrollable ? "auto" : undefined} flex={scrollable ? 1 : undefined}>
      <WorkspaceResultLayout
        config={config}
        layout={view.layout}
        rows={rows}
        onSelect={onSelect}
        selectedProperties={selectedProperties}
        virtualize={scrollable}
      />
      {query.hasNextPage && <div ref={sentinelRef} />}
    </Stack>
  );
}
