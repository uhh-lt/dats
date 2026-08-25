import { UserRenderer } from "@core/user";
import { leafColumn, WorkspaceTableRow } from "@core/workspace";
import { MemoColumns } from "@models/MemoColumns";
import { MemoRead } from "@models/MemoRead";
import { Typography } from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { formatOptionLabel } from "@utils/StringUtils";
import { MRT_ColumnDef } from "material-react-table";
import { MemoFavoriteIconButton } from "../MemoFavoriteIconButton";
import { MemoPresentationFlags } from "./MemoPresentationProps";

/**
 * Single source of truth linking memo columns to presentation. Each key is one
 * user-selectable property (a column in the workspace "properties" selector) and
 * the value is the render flag it switches on.
 *
 * Columns absent from this map (e.g. `M_ATTACHED_OBJECT_TYPE`) have no
 * presentation equivalent: they are not selectable and map to no flag. Flags that
 * no column backs (`renderIcon`, `attachedObjectLink`, `renderActionMenu`) stay
 * under the caller's control.
 */
const MEMO_COLUMN_TO_FLAG = {
  [MemoColumns.M_TITLE]: "renderTitle",
  [MemoColumns.M_CONTENT]: "renderContent",
  [MemoColumns.M_USER_ID]: "renderAuthor",
  [MemoColumns.M_CREATED]: "renderCreatedDate",
  [MemoColumns.M_UPDATED]: "renderUpdatedDate",
  [MemoColumns.M_FAVORITE]: "renderFavoriteStatus",
  [MemoColumns.M_ATTACHED_OBJECT_ID]: "renderAttachedObject",
} satisfies Partial<Record<MemoColumns, keyof MemoPresentationFlags>>;

/**
 * The memo columns the user may select for rendering — exactly the keys of
 * {@link MEMO_COLUMN_TO_FLAG}. Table column defs are typed as `Record<RenderableMemoColumn, …>`
 * so the compiler forces one def per renderable column (no missing/extra defs).
 */
export type RenderableMemoColumn = keyof typeof MEMO_COLUMN_TO_FLAG;

/**
 * Which memo columns the user may select for rendering, derived from
 * {@link MEMO_COLUMN_TO_FLAG}. Satisfies the workspace config's
 * `renderableColumns` contract (a `Record` over every `MemoColumns`).
 */
export const memoRenderableColumns: Record<MemoColumns, boolean> = Object.values(MemoColumns).reduce(
  (acc, column) => {
    acc[column] = column in MEMO_COLUMN_TO_FLAG;
    return acc;
  },
  {} as Record<MemoColumns, boolean>,
);

/**
 * Maps a set of selected memo properties (columns) to the render flags shared by
 * all memo presentation containers. This is the bridge between the workspace's
 * "properties" selector and the flag-based presentation components: each selected
 * column turns on the corresponding render flag.
 */
export function memoColumnsToFlags(selectedProperties: MemoColumns[]): MemoPresentationFlags {
  const flags: MemoPresentationFlags = {};
  for (const column of selectedProperties) {
    if (column in MEMO_COLUMN_TO_FLAG) {
      flags[MEMO_COLUMN_TO_FLAG[column as RenderableMemoColumn]] = true;
    }
  }
  return flags;
}

/**
 * Column definitions for the memo workspace's flat Material React Table, one per renderable
 * `MemoColumns`. All defs are returned in canonical enum order; the table derives MRT's
 * `columnVisibility` from the view's selected properties, so this list is stable and does not
 * change when the selection changes. Leaf cells render memo fields; group-header discrimination
 * is handled by `leafColumn`.
 *
 * `M_ATTACHED_OBJECT_TYPE` has no def: it is not a renderable property (it backs grouping, not a
 * table column). The single "Attached to" column is keyed by `M_ATTACHED_OBJECT_ID` and renders
 * the attached object's type label.
 */
export const memoTableColumns: MRT_ColumnDef<WorkspaceTableRow<MemoRead>>[] = (() => {
  // Keyed by RenderableMemoColumn so the compiler forces exactly one def per renderable column:
  // a missing or extra key is a type error, keeping the defs in sync with memoRenderableColumns.
  const defs: Record<RenderableMemoColumn, MRT_ColumnDef<WorkspaceTableRow<MemoRead>>> = {
    [MemoColumns.M_TITLE]: leafColumn<MemoRead>({
      id: MemoColumns.M_TITLE,
      header: "Title",
      size: 320,
      cell: (memo) => memo.title,
    }),
    [MemoColumns.M_CONTENT]: leafColumn<MemoRead>({
      id: MemoColumns.M_CONTENT,
      header: "Content",
      size: 320,
      // noWrap clamps to one line with an ellipsis, so long content never drives the row height.
      cell: (memo) => <Typography noWrap>{memo.content}</Typography>,
    }),
    [MemoColumns.M_USER_ID]: leafColumn<MemoRead>({
      id: MemoColumns.M_USER_ID,
      header: "Author",
      size: 160,
      cell: (memo) => <UserRenderer user={memo.user_id} />,
    }),
    [MemoColumns.M_ATTACHED_OBJECT_ID]: leafColumn<MemoRead>({
      id: MemoColumns.M_ATTACHED_OBJECT_ID,
      header: "Attached to",
      size: 160,
      cell: (memo) => formatOptionLabel(memo.attached_object_type),
    }),
    [MemoColumns.M_CREATED]: leafColumn<MemoRead>({
      id: MemoColumns.M_CREATED,
      header: "Created",
      size: 180,
      cell: (memo) => dateToLocaleString(memo.created),
    }),
    [MemoColumns.M_UPDATED]: leafColumn<MemoRead>({
      id: MemoColumns.M_UPDATED,
      header: "Updated",
      size: 180,
      cell: (memo) => dateToLocaleString(memo.updated),
    }),
    [MemoColumns.M_FAVORITE]: leafColumn<MemoRead>({
      id: MemoColumns.M_FAVORITE,
      header: "Favorite",
      size: 80,
      cell: (memo) => <MemoFavoriteIconButton memo={memo} />,
    }),
  };
  // Canonical enum order, restricted to the renderable columns.
  return Object.values(MemoColumns)
    .filter((column): column is RenderableMemoColumn => column in defs)
    .map((column) => defs[column]);
})();
