import { UserRenderer } from "@core/user";
import { leafColumn, WorkspaceTableRow } from "@core/workspace";
import { MemoColumns } from "@models/MemoColumns";
import { MemoRow } from "@models/MemoRow";
import { dateToLocaleString } from "@utils/DateUtils";
import { formatOptionLabel } from "@utils/StringUtils";
import { MRT_ColumnDef } from "material-react-table";
import { useMemo } from "react";
import { MemoFavoriteIconButton } from "../MemoFavoriteIconButton";

/**
 * Column definitions for the memo workspace's flat Material React Table, one per `MemoColumns`.
 * Only the view's selected properties are returned, so the table adapts to the "properties"
 * selector. Leaf cells render memo fields; group-header discrimination is handled by `leafColumn`.
 */
export const useMemoTableColumns = (
  onSelect: (id: number) => void,
  selectedProperties: MemoColumns[],
): MRT_ColumnDef<WorkspaceTableRow<MemoRow>>[] =>
  useMemo<MRT_ColumnDef<WorkspaceTableRow<MemoRow>>[]>(() => {
    const all: Record<MemoColumns, MRT_ColumnDef<WorkspaceTableRow<MemoRow>>> = {
      [MemoColumns.M_TITLE]: leafColumn<MemoRow>({
        id: MemoColumns.M_TITLE,
        header: "Title",
        size: 320,
        cell: (memo) => (
          <span onClick={() => onSelect(memo.id)} style={{ cursor: "pointer" }}>
            {memo.title}
          </span>
        ),
      }),
      [MemoColumns.M_CONTENT]: leafColumn<MemoRow>({
        id: MemoColumns.M_CONTENT,
        header: "Content",
        size: 320,
        cell: (memo) => memo.content_excerpt,
      }),
      [MemoColumns.M_USER_ID]: leafColumn<MemoRow>({
        id: MemoColumns.M_USER_ID,
        header: "Author",
        size: 160,
        cell: (memo) => <UserRenderer user={memo.user_id} />,
      }),
      [MemoColumns.M_ATTACHED_OBJECT_TYPE]: leafColumn<MemoRow>({
        id: MemoColumns.M_ATTACHED_OBJECT_TYPE,
        header: "Attached to",
        size: 160,
        cell: (memo) => formatOptionLabel(memo.attached_object_type),
      }),
      [MemoColumns.M_ATTACHED_OBJECT_ID]: leafColumn<MemoRow>({
        id: MemoColumns.M_ATTACHED_OBJECT_ID,
        header: "Attached to",
        size: 160,
        cell: (memo) => formatOptionLabel(memo.attached_object_type),
      }),
      [MemoColumns.M_CREATED]: leafColumn<MemoRow>({
        id: MemoColumns.M_CREATED,
        header: "Created",
        size: 180,
        cell: (memo) => dateToLocaleString(memo.created),
      }),
      [MemoColumns.M_UPDATED]: leafColumn<MemoRow>({
        id: MemoColumns.M_UPDATED,
        header: "Updated",
        size: 180,
        cell: (memo) => dateToLocaleString(memo.updated),
      }),
      [MemoColumns.M_FAVORITE]: leafColumn<MemoRow>({
        id: MemoColumns.M_FAVORITE,
        header: "Favorite",
        size: 80,
        cell: (memo) => <MemoFavoriteIconButton memo={memo} />,
      }),
    };
    return selectedProperties.map((column) => all[column]);
  }, [onSelect, selectedProperties]);
