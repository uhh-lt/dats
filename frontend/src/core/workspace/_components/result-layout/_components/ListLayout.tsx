import { Stack } from "@mui/material";
import { ReactNode, useCallback } from "react";
import { LayoutProps } from "./LayoutProps";
import { VirtualizedRows } from "./VirtualizedRows";

/** LIST layout shell: a virtualized stack of list items (plain stack when not virtualized). */
export function ListLayout<TColumns extends string, TRow extends { id: number }>({
  config,
  rows,
  onSelect,
  selectedProperties,
  virtualize = true,
}: LayoutProps<TColumns, TRow>): ReactNode {
  const renderRow = useCallback(
    (row: TRow) => config.renderListItem(row, onSelect, selectedProperties),
    [config, onSelect, selectedProperties],
  );
  if (!virtualize) return <Stack>{rows.map(renderRow)}</Stack>;
  return <VirtualizedRows rows={rows} renderRow={renderRow} estimateSize={72} />;
}
