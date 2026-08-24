import { MemoHooks } from "@api/hooks/MemoHooks";
import { MemoViewHooks } from "@api/hooks/MemoViewHooks";
import {
  MemoCard,
  MemoCreateIconButton,
  MemoFeedItem,
  MemoListItem,
  memoColumnsToFlags,
  memoRenderableColumns,
  useMemoSearchInfo,
  useMemoTableColumns,
} from "@core/memo";
import { EntityWorkspaceConfig, WorkspaceGroupQueryRequest, WorkspaceQueryRequest } from "@core/workspace";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { GroupQueryRequest_MemoColumns_ } from "@models/GroupQueryRequest_MemoColumns_";
import { MemoColumns } from "@models/MemoColumns";
import { MemoRow } from "@models/MemoRow";
import { QueryRequest_MemoColumns_ } from "@models/QueryRequest_MemoColumns_";
import { SearchEntityType } from "@models/SearchEntityType";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CategoryIcon from "@mui/icons-material/Category";
import LinkIcon from "@mui/icons-material/Link";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import SubjectIcon from "@mui/icons-material/Subject";
import TitleIcon from "@mui/icons-material/Title";
import UpdateIcon from "@mui/icons-material/Update";
import { ReactNode } from "react";
import { MemoTableSelectionActions } from "./MemoTableSelectionActions";
import { createMemoTemplates, emptyMemoFilter, memoDefaultFilterExpression } from "./memoTemplates";

const columnIcons: Record<MemoColumns, ReactNode> = {
  [MemoColumns.M_TITLE]: <TitleIcon fontSize="small" />,
  [MemoColumns.M_CONTENT]: <SubjectIcon fontSize="small" />,
  [MemoColumns.M_USER_ID]: <AccountCircleIcon fontSize="small" />,
  [MemoColumns.M_ATTACHED_OBJECT_TYPE]: <CategoryIcon fontSize="small" />,
  [MemoColumns.M_ATTACHED_OBJECT_ID]: <LinkIcon fontSize="small" />,
  [MemoColumns.M_CREATED]: <CalendarMonthIcon fontSize="small" />,
  [MemoColumns.M_UPDATED]: <UpdateIcon fontSize="small" />,
  [MemoColumns.M_FAVORITE]: <StarBorderIcon fontSize="small" />,
};

/** Properties rendered when a view has no explicit selection. */
const defaultSelectedProperties: MemoColumns[] = [
  MemoColumns.M_TITLE,
  MemoColumns.M_CONTENT,
  MemoColumns.M_FAVORITE,
  MemoColumns.M_ATTACHED_OBJECT_ID,
];

/**
 * Builds the memo workspace config. `userId` is needed for the "My Memos"
 * create-view template.
 */
export const createMemoWorkspaceConfig = (userId: number): EntityWorkspaceConfig<MemoColumns, MemoRow> => ({
  entityType: SearchEntityType.MEMO,
  entityLabel: "memo",
  columns: MemoColumns,
  columnIcons,
  renderableColumns: memoRenderableColumns,
  defaultSelectedProperties,
  defaultFilterExpression: memoDefaultFilterExpression,
  dateColumns: [MemoColumns.M_CREATED, MemoColumns.M_UPDATED],
  defaultGroupBy: { field: MemoColumns.M_ATTACHED_OBJECT_TYPE },
  emptyFilter: emptyMemoFilter,

  useSearchInfo: useMemoSearchInfo,
  useQueryRows: (request: WorkspaceQueryRequest<MemoColumns>, enabled?: boolean) =>
    MemoHooks.useQueryMemos(request as QueryRequest_MemoColumns_, { enabled }),
  useQueryGroups: (request: WorkspaceGroupQueryRequest<MemoColumns>, enabled?: boolean) =>
    MemoHooks.useQueryMemoGroups(request as GroupQueryRequest_MemoColumns_, enabled),
  useSearchViews: MemoViewHooks,

  useTableColumns: useMemoTableColumns,
  renderTableSelectionActions: (selectedIds, clearSelection) => (
    <MemoTableSelectionActions selectedIds={selectedIds} clearSelection={clearSelection} />
  ),
  renderListItem: (row, onSelect, selectedProperties) => (
    <MemoListItem
      key={row.id}
      memo={row}
      onSelect={onSelect}
      renderActionMenu
      {...memoColumnsToFlags(selectedProperties)}
    />
  ),
  renderCard: (row, onSelect, selectedProperties) => (
    <MemoCard
      key={row.id}
      memo={row}
      onSelect={onSelect}
      renderActionMenu
      {...memoColumnsToFlags(selectedProperties)}
    />
  ),
  renderFeedItem: (row, onSelect, selectedProperties) => (
    <MemoFeedItem
      key={row.id}
      memo={row}
      onSelect={onSelect}
      renderActionMenu
      {...memoColumnsToFlags(selectedProperties)}
    />
  ),

  templates: createMemoTemplates(userId),
  renderGroupAction: (group, onSelect) =>
    group.target_id != null && group.target_type ? (
      <MemoCreateIconButton
        attachedObjectId={group.target_id}
        attachedObjectType={group.target_type as AttachedObjectType}
        onCreated={onSelect}
      />
    ) : null,
});
