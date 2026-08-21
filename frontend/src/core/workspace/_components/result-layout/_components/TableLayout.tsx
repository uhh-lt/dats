import { Table, TableBody } from "@mui/material";
import { ReactNode } from "react";
import { LayoutProps } from "./LayoutProps";

/** TABLE layout shell: a table with the config's header and one row per entity. */
export function TableLayout<TColumns extends string, TRow extends { id: number }>({
  config,
  rows,
  onSelect,
}: LayoutProps<TColumns, TRow>): ReactNode {
  return (
    <Table size="small">
      {config.tableHeader}
      <TableBody>{rows.map((row) => config.renderTableRow(row, onSelect))}</TableBody>
    </Table>
  );
}
