import { createSearchViewHooks } from "@api/hooks/SearchViewHooks";
import { ColumnInfo, MyFilter, MyFilterExpression } from "@core/filter";
import { GroupPage } from "@models/GroupPage";
import { GroupSummary } from "@models/GroupSummary";
import { SearchEntityType } from "@models/SearchEntityType";
import { SearchViewLayout } from "@models/SearchViewLayout";
import { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  WorkspaceGroupConfig,
  WorkspaceGroupQueryRequest,
  WorkspacePage,
  WorkspaceQueryRequest,
  WorkspaceSort,
} from "./WorkspaceGeneratedTypes";

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
  defaultFilterExpression: MyFilterExpression<TColumns>;
  /** Columns that get a date-granularity selector when used for grouping. */
  dateColumns: TColumns[];
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
  /** Header cells for the TABLE layout. */
  tableHeader: ReactNode;
  renderTableRow: (row: TRow, onSelect: (id: number) => void) => ReactNode;
  renderListItem: (row: TRow, onSelect: (id: number) => void) => ReactNode;
  renderCard: (row: TRow, onSelect: (id: number) => void) => ReactNode;
  renderFeedItem: (row: TRow, onSelect: (id: number) => void) => ReactNode;

  // ---- create-view templates ----
  templates: WorkspaceTemplate<TColumns>[];

  /** Optional per-group action (e.g. memos can create a memo attached to the group's target). */
  renderGroupAction?: (group: GroupSummary, onSelect: (id: number) => void) => ReactNode;
}
