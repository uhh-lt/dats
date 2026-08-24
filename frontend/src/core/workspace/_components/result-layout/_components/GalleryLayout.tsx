import { Box } from "@mui/material";
import { ReactNode } from "react";
import { LayoutProps } from "./LayoutProps";

/** GALLERY layout shell: a responsive grid of cards. */
export function GalleryLayout<TColumns extends string, TRow extends { id: number }>({
  config,
  rows,
  onSelect,
  selectedProperties,
}: LayoutProps<TColumns, TRow>): ReactNode {
  return (
    <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(240px, 1fr))" gap={2} p={2}>
      {rows.map((row) => config.renderCard(row, onSelect, selectedProperties))}
    </Box>
  );
}
