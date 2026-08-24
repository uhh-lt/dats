import { Stack } from "@mui/material";
import { ReactNode } from "react";
import { LayoutProps } from "./LayoutProps";

/** FEED layout shell: a spaced, padded stack of feed items. */
export function FeedLayout<TColumns extends string, TRow extends { id: number }>({
  config,
  rows,
  onSelect,
  selectedProperties,
}: LayoutProps<TColumns, TRow>): ReactNode {
  return (
    <Stack spacing={2} p={2}>
      {rows.map((row) => config.renderFeedItem(row, onSelect, selectedProperties))}
    </Stack>
  );
}
