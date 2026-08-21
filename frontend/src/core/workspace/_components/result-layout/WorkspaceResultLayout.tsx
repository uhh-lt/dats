import { SearchViewLayout } from "@models/SearchViewLayout";
import { Typography } from "@mui/material";
import { ReactNode, useMemo } from "react";
import { EntityWorkspaceConfig } from "../../types/EntityWorkspaceConfig";
import { FeedLayout } from "./_components/FeedLayout";
import { GalleryLayout } from "./_components/GalleryLayout";
import { ListLayout } from "./_components/ListLayout";
import { TableLayout } from "./_components/TableLayout";

interface WorkspaceLayoutProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  layout: SearchViewLayout;
  rows: TRow[];
  onSelect: (id: number) => void;
}

/** Renders rows in the active layout by delegating to the config's per-layout renderers. */
export function WorkspaceResultLayout<TColumns extends string, TRow extends { id: number }>({
  config,
  layout,
  rows,
  onSelect,
}: WorkspaceLayoutProps<TColumns, TRow>): ReactNode {
  const layoutComponents = useMemo<Record<SearchViewLayout, ReactNode>>(
    () => ({
      [SearchViewLayout.TABLE]: <TableLayout config={config} rows={rows} onSelect={onSelect} />,
      [SearchViewLayout.LIST]: <ListLayout config={config} rows={rows} onSelect={onSelect} />,
      [SearchViewLayout.GALLERY]: <GalleryLayout config={config} rows={rows} onSelect={onSelect} />,
      [SearchViewLayout.FEED]: <FeedLayout config={config} rows={rows} onSelect={onSelect} />,
      [SearchViewLayout.BOARD]: <ListLayout config={config} rows={rows} onSelect={onSelect} />,
    }),
    [config, rows, onSelect],
  );

  if (!rows.length)
    return (
      <Typography color="text.secondary" p={2}>
        No {config.entityLabel} match this view.
      </Typography>
    );
  return layoutComponents[layout];
}
