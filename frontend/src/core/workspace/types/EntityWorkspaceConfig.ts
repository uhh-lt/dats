import { createSearchViewHooks } from "@api/hooks/SearchViewHooks";
import { ColumnInfo, MyFilter, MyFilterExpression } from "@core/filter";
import { GroupPage } from "@models/GroupPage";
import { GroupSummary } from "@models/GroupSummary";
import { SearchEntityType } from "@models/SearchEntityType";
import { SearchViewLayout } from "@models/SearchViewLayout";
import { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";
import { MRT_ColumnDef } from "material-react-table";
import { ReactNode } from "react";
import {
  WorkspaceGroupConfig,
  WorkspaceGroupQueryRequest,
  WorkspacePage,
  WorkspaceQueryRequest,
  WorkspaceSort,
} from "./WorkspaceGeneratedTypes";
import { WorkspaceTableRow } from "./WorkspaceTableRow";

/** A create-view template shown in the "new view" menu. */
export interface WorkspaceTemplate<TColumns extends string> {
  icon: ReactNode;
  label: string;
  layout: SearchViewLayout;
  filters?: MyFilter<TColumns>;
  groupBy?: WorkspaceGroupConfig<TColumns>;
  sorts?: WorkspaceSort<TColumns>[];
}

/**
 * Everything entity-specific the generic `EntityWorkspace` needs. Each entity
 * (memo, span annotation, ...) supplies one config; the workspace stays generic.
 */
export interface EntityWorkspaceConfig<TColumns extends string, TRow extends { id: number }> {
  entityType: SearchEntityType;
  /** Human-readable entity name, used in empty states and the search placeholder. */
  entityLabel: string;
  /** The column enum (values), used to enumerate sortable/groupable columns. */
  columns: Record<TColumns, TColumns>;
  columnIcons: Record<TColumns, ReactNode>;
  /** Which columns the user may select for rendering (the "properties" selector). */
  renderableColumns: Record<TColumns, boolean>;
  /** Properties rendered when a view has no explicit `selected_properties`. */
  defaultSelectedProperties: TColumns[];
  defaultFilterExpression: MyFilterExpression<TColumns>;
  /** Columns that get a date-granularity selector when used for grouping. */
  dateColumns: TColumns[];
  /** Default grouping applied when creating a BOARD view without an explicit groupBy. */
  defaultGroupBy?: WorkspaceGroupConfig<TColumns>;
  /** Default filter factory for a brand-new view. */
  emptyFilter: () => MyFilter<TColumns>;

  // ---- data hooks ----
  useSearchInfo: (projectId: number) => UseQueryResult<Record<string, ColumnInfo>, Error>;
  useQueryRows: (
    request: WorkspaceQueryRequest<TColumns>,
    enabled?: boolean,
  ) => UseInfiniteQueryResult<InfiniteData<WorkspacePage<TRow>>, Error>;
  useQueryGroups: (
    request: WorkspaceGroupQueryRequest<TColumns>,
    enabled?: boolean,
  ) => UseInfiniteQueryResult<InfiniteData<GroupPage>, Error>;
  useSearchViews: ReturnType<typeof createSearchViewHooks>;

  // ---- renderers (per layout) ----
  /**
   * Column definitions for the flat Material React Table TABLE layout, typed on the union
   * `WorkspaceTableRow<TRow>`. Build leaf cells with the `leafColumn` helper so group-header
   * discrimination is handled for you; the table renders group headers via the first column.
   *
   * Return one def per renderable column (see `renderableColumns`), in a stable order. The table
   * derives MRT's `columnVisibility` from the view's selected properties, so this list must NOT
   * be filtered by the selection — it stays stable as the user toggles properties.
   *
   * The defs are memoized on `onSelect`, so `onSelect` MUST be referentially stable (wrap it in
   * `useCallback` at the source). An unstable `onSelect` rebuilds every column def each render.
   */
  useTableColumns: (onSelect: (id: number) => void) => MRT_ColumnDef<WorkspaceTableRow<TRow>>[];
  renderListItem: (row: TRow, onSelect: (id: number) => void, selectedProperties: TColumns[]) => ReactNode;
  renderCard: (row: TRow, onSelect: (id: number) => void, selectedProperties: TColumns[]) => ReactNode;
  renderFeedItem: (row: TRow, onSelect: (id: number) => void, selectedProperties: TColumns[]) => ReactNode;

  // ---- create-view templates ----
  templates: WorkspaceTemplate<TColumns>[];

  /** Optional per-group action (e.g. memos can create a memo attached to the group's target). */
  renderGroupAction?: (group: GroupSummary, onSelect: (id: number) => void) => ReactNode;
  /**
   * Optional bulk actions shown in the TABLE layout's selection toolbar when rows are selected.
   * Receives the selected entity ids and a callback to clear the selection.
   */
  renderTableSelectionActions?: (selectedIds: number[], clearSelection: () => void) => ReactNode;
}
