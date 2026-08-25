import { GroupSummary } from "@models/GroupSummary";
import { Box, Typography } from "@mui/material";
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_ColumnSizingState,
  MRT_ExpandedState,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_VisibilityState,
  useMaterialReactTable,
} from "material-react-table";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EntityWorkspaceConfig } from "../../types/EntityWorkspaceConfig";
import { WorkspaceView } from "../../types/WorkspaceGeneratedTypes";
import { WorkspaceTableRow } from "../../types/WorkspaceTableRow";
import { GroupSubRowsFetcher } from "./_components/GroupSubRowsFetcher";
import { TableSelectionToolbar } from "./_components/TableSelectionToolbar";
import { useGroupSubRows } from "./_components/useGroupSubRows";
import { isGroupHeaderRow, toGroupHeaderRow, toLeafRow } from "./_utils/tableRowUtils";

const GROUP_ROW_ID_PREFIX = "group:";
const LEAF_ROW_ID_PREFIX = "row:";

interface TableLayoutProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  projectId: number;
  view: WorkspaceView<TColumns>;
  searchQuery: string;
  onSelect: (id: number) => void;
  /** Groups to render as expandable header rows. Undefined = ungrouped flat table. */
  groups?: GroupSummary[];
  /** Rows for the ungrouped flat table (ignored when grouped). */
  rows?: TRow[];
  /** Persisted expanded group keys for this view. */
  expandedGroupKeys?: string[];
  onToggleGroup: (groupKey: string, expanded: boolean, allGroupKeys: string[]) => void;
  /** Persisted column widths (column id -> px) for this view. */
  columnSizing?: Record<string, number>;
  onColumnSizingChange: (columnSizing: Record<string, number>) => void;
  /** Ungrouped infinite scroll: fetch the next page of flat rows. */
  fetchNextPage?: () => void;
  isFetching?: boolean;
  totalFetched?: number;
  totalResults?: number;
}

/**
 * The workspace TABLE layout: a single Material React Table. Grouped views render one expandable
 * group-header row per group (sub-rows fetched lazily per group); ungrouped views render a flat
 * virtualized table. Provides column resizing, row selection with a bulk-action toolbar, and
 * virtualized infinite scroll. Sorting/filtering/column-visibility stay in the workspace toolbar.
 */
export function TableLayout<TColumns extends string, TRow extends { id: number }>({
  config,
  projectId,
  view,
  searchQuery,
  onSelect,
  groups,
  rows,
  expandedGroupKeys,
  onToggleGroup,
  columnSizing,
  onColumnSizingChange,
  fetchNextPage,
  isFetching,
  totalFetched,
  totalResults,
}: TableLayoutProps<TColumns, TRow>): ReactNode {
  const isGrouped = Boolean(view.group_by) && groups !== undefined;
  const entityColumns = config.tableColumns;

  // Column visibility is driven by the view's selected properties (the "properties" selector),
  // the defs are stable, and we derive MRT's columnVisibility
  // state so hidden columns keep their identity/order. Only renderable columns are toggleable.
  const columnVisibility = useMemo<MRT_VisibilityState>(() => {
    const selected = new Set<string>(view.selected_properties ?? config.defaultSelectedProperties);
    return Object.keys(config.renderableColumns).reduce<MRT_VisibilityState>((acc, columnId) => {
      acc[columnId] = selected.has(columnId);
      return acc;
    }, {});
  }, [view.selected_properties, config.defaultSelectedProperties, config.renderableColumns]);
  const { registry, register, unregister } = useGroupSubRows<TRow>();
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  const allGroupKeys = useMemo(() => (groups ?? []).map((g) => g.key), [groups]);

  // Expanded state derived from the persisted group keys (default: first group expanded).
  const expanded = useMemo<MRT_ExpandedState>(() => {
    if (!isGrouped) return {};
    const keys = expandedGroupKeys ?? allGroupKeys.slice(0, 1);
    return keys.reduce<Record<string, boolean>>((acc, key) => {
      acc[`${GROUP_ROW_ID_PREFIX}${key}`] = true;
      return acc;
    }, {});
  }, [isGrouped, expandedGroupKeys, allGroupKeys]);

  const handleExpandedChange = useCallback(
    (updater: MRT_ExpandedState | ((old: MRT_ExpandedState) => MRT_ExpandedState)) => {
      if (!isGrouped || expanded === true) return;
      const next = typeof updater === "function" ? updater(expanded) : updater;
      if (next === true) return;
      for (const key of allGroupKeys) {
        const rowId = `${GROUP_ROW_ID_PREFIX}${key}`;
        const isNow = Boolean(next[rowId]);
        const was = Boolean(expanded[rowId]);
        if (isNow !== was) onToggleGroup(key, isNow, allGroupKeys);
      }
    },
    [isGrouped, expanded, allGroupKeys, onToggleGroup],
  );

  // Root rows: one group-header per group (grouped) or all entity rows as flat roots (ungrouped).
  const data = useMemo<WorkspaceTableRow<TRow>[]>(() => {
    if (!isGrouped) return (rows ?? []).map(toLeafRow);
    return (groups ?? []).map((group) => toGroupHeaderRow(group, (registry[group.key]?.rows ?? []).map(toLeafRow)));
  }, [isGrouped, groups, rows, registry]);

  // Columns come from the config typed on the union row. We prepend a leading group-label column
  // that renders the group label + muted count on header rows and nothing on leaf rows.
  const tableColumns = useMemo<MRT_ColumnDef<WorkspaceTableRow<TRow>>[]>(() => {
    if (!isGrouped) return entityColumns;
    const groupLabelColumn: MRT_ColumnDef<WorkspaceTableRow<TRow>> = {
      id: "groupLabel",
      header: "Group",
      accessorFn: (original) => original.group?.label ?? "",
      size: 220,
      // The group-label column is structural, not a renderable property: never hide it.
      enableHiding: false,
      Cell: ({ row }) => {
        const original = row.original;
        if (!isGroupHeaderRow(original)) return null;
        return (
          <>
            <Typography component="span" fontWeight={600} noWrap>
              {original.group!.label}
            </Typography>{" "}
            <Typography component="span" color="text.secondary">
              {original.group!.total_results}
            </Typography>
          </>
        );
      },
    };
    return [groupLabelColumn, ...entityColumns];
  }, [isGrouped, entityColumns]);

  const expandedKeys = useMemo(
    () =>
      expanded === true
        ? allGroupKeys
        : Object.keys(expanded)
            .filter((k) => expanded[k] && k.startsWith(GROUP_ROW_ID_PREFIX))
            .map((k) => k.slice(GROUP_ROW_ID_PREFIX.length)),
    [expanded, allGroupKeys],
  );

  // Infinite scroll: when the user scrolls near the bottom, fetch more. Ungrouped fetches the next
  // flat page; grouped fetches the next page of every expanded group that has more results.
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight >= 400) return;
      if (!isGrouped) {
        if (!isFetching && fetchNextPage && (totalFetched ?? 0) < (totalResults ?? 0)) fetchNextPage();
        return;
      }
      for (const key of expandedKeys) {
        const state = registry[key];
        if (state && !state.isFetching && state.hasNextPage) state.fetchNextPage();
      }
    },
    [isGrouped, isFetching, fetchNextPage, totalFetched, totalResults, expandedKeys, registry],
  );

  const selectedIds = useMemo(
    () =>
      Object.keys(rowSelection)
        .filter((k) => rowSelection[k] && k.startsWith(LEAF_ROW_ID_PREFIX))
        .map((k) => Number(k.slice(LEAF_ROW_ID_PREFIX.length)))
        .filter((n) => !Number.isNaN(n)),
    [rowSelection],
  );

  // Controlled column sizing, persisted per view. MRT supplies an updater; resolve it against the
  // current persisted value before storing.
  const columnSizingState = useMemo(() => columnSizing ?? {}, [columnSizing]);
  const handleColumnSizingChange = useCallback(
    (updater: MRT_ColumnSizingState | ((old: MRT_ColumnSizingState) => MRT_ColumnSizingState)) => {
      const next = typeof updater === "function" ? updater(columnSizingState) : updater;
      onColumnSizingChange(next);
    },
    [columnSizingState, onColumnSizingChange],
  );

  // Mirrors the proven-working SearchDocumentTable expanding config: keep virtualization on and set
  // autoResetAll=false so the controlled expanded state is not reset when sub-rows stream in.
  const table = useMaterialReactTable({
    columns: tableColumns,
    data,
    getRowId: (original) => original.id,
    getSubRows: isGrouped ? (original) => original.subRows : undefined,
    enableExpanding: isGrouped,
    // Lazy sub-rows: a group header is expandable based on its server-side count, before its
    // sub-rows have streamed in (the default getRowCanExpand would require subRows.length > 0).
    getRowCanExpand: (row) => isGroupHeaderRow(row.original) && (row.original.group?.total_results ?? 0) > 0,
    autoResetAll: false,
    rowCount: isGrouped ? (groups?.length ?? 0) : (totalResults ?? data.length),
    enableRowSelection: (row) => !isGroupHeaderRow(row.original),
    onRowSelectionChange: setRowSelection,
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef,
    // initialRect gives the virtualizer a non-zero measurement on first paint; without it the
    // container measures 0 height before layout settles and no rows render until an interaction.
    rowVirtualizerOptions: { overscan: 4, initialRect: { width: 0, height: 600 } },
    enablePagination: false,
    manualSorting: true,
    manualFiltering: true,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    // Hiding is enabled so the derived columnVisibility state applies, but all MRT-native hide UI
    // stays off (no column actions, no toolbars): visibility is driven solely by the properties
    // selector in the workspace toolbar.
    enableHiding: true,
    enableColumnActions: false,
    enableSorting: false,
    enableExpandAll: false,
    state: { expanded, rowSelection, columnSizing: columnSizingState, columnVisibility },
    onExpandedChange: handleExpandedChange,
    onColumnSizingChange: handleColumnSizingChange,
    // Clicking a leaf row opens the entity. Interactive cell content (favorite toggle, links,
    // expand buttons) stops propagation, so it does not also trigger selection.
    muiTableBodyRowProps: ({ row }) => ({
      onClick: isGroupHeaderRow(row.original) ? undefined : () => onSelect(row.original.row!.id),
      sx: isGroupHeaderRow(row.original) ? undefined : { cursor: "pointer" },
    }),
    muiTableContainerProps: { sx: { flex: 1, minHeight: 0 }, onScroll: handleScroll },
    muiTablePaperProps: { sx: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0 } },
  });

  // Once rows stream in, force the virtualizer to re-measure so the first page renders without
  // requiring a user interaction (the initial 0-height measurement would otherwise stick).
  const rowCount = data.length;
  useEffect(() => {
    if (rowCount === 0) return;
    rowVirtualizerInstanceRef.current?.measure();
  }, [rowCount]);

  return (
    <>
      {isGrouped &&
        expandedKeys.map((key) =>
          (groups ?? []).some((g) => g.key === key) ? (
            <GroupSubRowsFetcher
              key={key}
              config={config}
              projectId={projectId}
              view={view}
              searchQuery={searchQuery}
              groupKey={key}
              onRegister={register}
              onUnregister={unregister}
            />
          ) : null,
        )}
      {selectedIds.length > 0 && (
        <TableSelectionToolbar
          selectedIds={selectedIds}
          onClear={() => setRowSelection({})}
          actions={config.renderTableSelectionActions?.(selectedIds, () => setRowSelection({}))}
        />
      )}
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <MaterialReactTable table={table} />
      </Box>
    </>
  );
}
