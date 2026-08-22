import { MemoHooks } from "@api/hooks/MemoHooks";
import { MemoViewHooks } from "@api/hooks/MemoViewHooks";
import {
  MemoCard,
  MemoCreateIconButton,
  MemoFeedItem,
  MemoListItem,
  MemoTableHeader,
  MemoTableRow,
  useMemoSearchInfo,
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

/**
 * Builds the memo workspace config. `userId` is needed for the "My Memos"
 * create-view template.
 */
export const createMemoWorkspaceConfig = (userId: number): EntityWorkspaceConfig<MemoColumns, MemoRow> => ({
  entityType: SearchEntityType.MEMO,
  entityLabel: "memo",
  columns: MemoColumns,
  columnIcons,
  defaultFilterExpression: memoDefaultFilterExpression,
  dateColumns: [MemoColumns.M_CREATED, MemoColumns.M_UPDATED],
  emptyFilter: emptyMemoFilter,

  useSearchInfo: useMemoSearchInfo,
  useQueryRows: (request: WorkspaceQueryRequest<MemoColumns>, enabled?: boolean) =>
    MemoHooks.useQueryMemos(request as QueryRequest_MemoColumns_, { enabled }),
  useQueryGroups: (request: WorkspaceGroupQueryRequest<MemoColumns>, enabled?: boolean) =>
    MemoHooks.useQueryMemoGroups(request as GroupQueryRequest_MemoColumns_, enabled),
  useSearchViews: MemoViewHooks,

  tableHeader: <MemoTableHeader />,
  renderTableRow: (row, onSelect) => <MemoTableRow key={row.id} memo={row} onSelect={onSelect} />,
  renderListItem: (row, onSelect) => (
    <MemoListItem key={row.id} memo={row} onSelect={onSelect} renderTitle renderContent renderFavoriteButton />
  ),
  renderCard: (row, onSelect) => (
    <MemoCard
      key={row.id}
      memo={row}
      onSelect={onSelect}
      renderTitle
      renderContent
      renderFavoriteButton
      renderAttachedObject
    />
  ),
  renderFeedItem: (row, onSelect) => (
    <MemoFeedItem
      key={row.id}
      memo={row}
      onSelect={onSelect}
      renderTitle
      renderContent
      renderAuthor
      renderDate
      renderFavoriteButton
      renderAttachedObject
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
