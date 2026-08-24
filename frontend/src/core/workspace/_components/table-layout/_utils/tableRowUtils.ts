import { GroupSummary } from "@models/GroupSummary";
import { WorkspaceTableRow } from "../../../types/WorkspaceTableRow";

/** Type guard: is this table row a group header? */
export const isGroupHeaderRow = <TRow extends { id: number }>(r: WorkspaceTableRow<TRow>): boolean =>
  r.group !== undefined;

/** Wrap an entity row as a leaf table row. */
export const toLeafRow = <TRow extends { id: number }>(row: TRow): WorkspaceTableRow<TRow> => ({
  id: `row:${row.id}`,
  row,
});

/** Wrap a group as a group-header table row with the given leaf sub-rows. */
export const toGroupHeaderRow = <TRow extends { id: number }>(
  group: GroupSummary,
  subRows: WorkspaceTableRow<TRow>[],
): WorkspaceTableRow<TRow> => ({
  id: `group:${group.key}`,
  group,
  subRows,
});
