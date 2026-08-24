import { SearchViewLayout } from "@models/SearchViewLayout";
import { Typography } from "@mui/material";
import { ReactNode, useMemo } from "react";
import { EntityWorkspaceConfig } from "../../types/EntityWorkspaceConfig";
import { FeedLayout } from "./_components/FeedLayout";
import { GalleryLayout } from "./_components/GalleryLayout";
import { ListLayout } from "./_components/ListLayout";

interface WorkspaceLayoutProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  layout: SearchViewLayout;
  rows: TRow[];
  onSelect: (id: number) => void;
  selectedProperties: TColumns[];
  /** Whether to virtualize the rows (only when the shell owns its scroll container). */
  virtualize?: boolean;
}

/** Renders rows in the active layout by delegating to the config's per-layout renderers. */
export function WorkspaceResultLayout<TColumns extends string, TRow extends { id: number }>({
  config,
  layout,
  rows,
  onSelect,
  selectedProperties,
  virtualize = true,
}: WorkspaceLayoutProps<TColumns, TRow>): ReactNode {
  const layoutComponents = useMemo<Record<SearchViewLayout, ReactNode>>(
    () => ({
      [SearchViewLayout.TABLE]: (
        <Typography>The table layout should be accessed through the TableLayout component.</Typography>
      ),
      [SearchViewLayout.LIST]: (
        <ListLayout
          config={config}
          rows={rows}
          onSelect={onSelect}
          selectedProperties={selectedProperties}
          virtualize={virtualize}
        />
      ),
      [SearchViewLayout.GALLERY]: (
        <GalleryLayout
          config={config}
          rows={rows}
          onSelect={onSelect}
          selectedProperties={selectedProperties}
          virtualize={virtualize}
        />
      ),
      [SearchViewLayout.FEED]: (
        <FeedLayout
          config={config}
          rows={rows}
          onSelect={onSelect}
          selectedProperties={selectedProperties}
          virtualize={virtualize}
        />
      ),
      [SearchViewLayout.BOARD]: (
        <ListLayout
          config={config}
          rows={rows}
          onSelect={onSelect}
          selectedProperties={selectedProperties}
          virtualize={virtualize}
        />
      ),
    }),
    [config, rows, onSelect, selectedProperties, virtualize],
  );

  if (!rows.length)
    return (
      <Typography color="text.secondary" p={2}>
        No {config.entityLabel} match this view.
      </Typography>
    );
  return layoutComponents[layout];
}
