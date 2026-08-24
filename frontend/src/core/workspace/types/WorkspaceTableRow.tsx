import { GroupSummary } from "@models/GroupSummary";
import { MRT_ColumnDef } from "material-react-table";
import { ReactNode } from "react";

/**
 * A row in the workspace's flat MRT table. MRT requires sub-rows to share the root row type, so
 * both group-header rows and entity leaf rows use this single shape:
 * - Group header: `group` is set, `row` is undefined, `subRows` holds the group's entity rows.
 * - Entity leaf: `row` is set, `group` is undefined, `subRows` is undefined.
 */
export interface WorkspaceTableRow<TRow extends { id: number }> {
  /** Stable id for MRT's getRowId: `group:{key}` for headers, `row:{id}` for leaf rows. */
  id: string;
  /** Present when this is a group-header row. */
  group?: GroupSummary;
  /** Present when this is an entity leaf row. */
  row?: TRow;
  /** Entity leaf rows of a group header (lazy-fetched; empty while collapsed/loading). */
  subRows?: WorkspaceTableRow<TRow>[];
}

/**
 * Build a table column whose cell renders only for entity leaf rows. Group-header rows render
 * nothing in this column (the table renders the group label in the first column). This lets each
 * entity write plain leaf-cell renderers without handling group-header discrimination.
 */
export const leafColumn = <TRow extends { id: number }>(
  def: Omit<MRT_ColumnDef<WorkspaceTableRow<TRow>>, "Cell" | "accessorKey" | "accessorFn"> & {
    /** Stable column id (use the entity's column enum value). */
    id: string;
    header: string;
    /** Render the leaf cell from the entity row. Return null to render nothing. */
    cell: (row: TRow) => ReactNode;
  },
): MRT_ColumnDef<WorkspaceTableRow<TRow>> => {
  const { cell, ...rest } = def;
  return {
    ...rest,
    // MRT needs an accessor to build the cell; leaf rows expose their entity via `row`.
    accessorFn: (original) => original.row,
    Cell: ({ row }) => {
      const leaf = row.original.row;
      return leaf ? <>{cell(leaf)}</> : null;
    },
  };
};
