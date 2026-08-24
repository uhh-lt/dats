import { Stack } from "@mui/material";
import { ReactNode } from "react";
import { LayoutProps } from "./LayoutProps";

/** LIST layout shell: a plain stack of list items. */
export function ListLayout<TColumns extends string, TRow extends { id: number }>({
  config,
  rows,
  onSelect,
  selectedProperties,
}: LayoutProps<TColumns, TRow>): ReactNode {
  return <Stack>{rows.map((row) => config.renderListItem(row, onSelect, selectedProperties))}</Stack>;
}
