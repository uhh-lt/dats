import { MemoColumns } from "@models/MemoColumns";
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
const MEMO_COLUMN_TO_FLAG: Partial<Record<MemoColumns, keyof MemoPresentationFlags>> = {
  [MemoColumns.M_TITLE]: "renderTitle",
  [MemoColumns.M_CONTENT]: "renderContent",
  [MemoColumns.M_USER_ID]: "renderAuthor",
  [MemoColumns.M_CREATED]: "renderCreatedDate",
  [MemoColumns.M_UPDATED]: "renderUpdatedDate",
  [MemoColumns.M_FAVORITE]: "renderFavoriteStatus",
  [MemoColumns.M_ATTACHED_OBJECT_ID]: "renderAttachedObject",
};

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
    const flag = MEMO_COLUMN_TO_FLAG[column];
    if (flag) {
      flags[flag] = true;
    }
  }
  return flags;
}
