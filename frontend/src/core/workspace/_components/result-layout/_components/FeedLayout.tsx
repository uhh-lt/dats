import { Stack } from "@mui/material";
import { ReactNode, useCallback } from "react";
import { LayoutProps } from "./LayoutProps";
import { VirtualizedRows } from "./VirtualizedRows";

/** FEED layout shell: a virtualized, spaced, padded stack of feed items (plain stack when not virtualized). */
export function FeedLayout<TColumns extends string, TRow extends { id: number }>({
  config,
  rows,
  onSelect,
  selectedProperties,
  virtualize = true,
}: LayoutProps<TColumns, TRow>): ReactNode {
  const renderRow = useCallback(
    (row: TRow) => config.renderFeedItem(row, onSelect, selectedProperties),
    [config, onSelect, selectedProperties],
  );
  if (!virtualize)
    return (
      <Stack spacing={2} p={2}>
        {rows.map(renderRow)}
      </Stack>
    );
  // spacing={2} p={2} on the plain Stack -> 16px gap and padding; feed items are tall & variable.
  return <VirtualizedRows rows={rows} renderRow={renderRow} estimateSize={200} gap={16} yPadding={16} xPadding={16} />;
}
