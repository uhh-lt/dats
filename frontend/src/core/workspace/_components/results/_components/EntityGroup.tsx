import { GroupSummary } from "@models/GroupSummary";
import { SearchViewLayout } from "@models/SearchViewLayout";
import { Divider, Paper, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";
import { EntityWorkspaceConfig } from "../../../types/EntityWorkspaceConfig";
import { WorkspaceView } from "../../../types/WorkspaceGeneratedTypes";
import { EntityResultList } from "./EntityResultList";

interface EntityGroupProps<TColumns extends string, TRow extends { id: number }> {
  group: GroupSummary;
  config: EntityWorkspaceConfig<TColumns, TRow>;
  projectId: number;
  view: WorkspaceView<TColumns>;
  searchQuery: string;
  onSelect: (id: number) => void;
}

/** One group in a grouped view: a paper with a header (label, count, group action) and its rows. */
export function EntityGroup<TColumns extends string, TRow extends { id: number }>({
  group,
  config,
  projectId,
  view,
  searchQuery,
  onSelect,
}: EntityGroupProps<TColumns, TRow>): ReactNode {
  const nestedView = { ...view, layout: view.layout === SearchViewLayout.BOARD ? SearchViewLayout.LIST : view.layout };
  return (
    <Paper
      variant="outlined"
      sx={{
        minWidth: view.layout === SearchViewLayout.BOARD ? 320 : "100%",
        maxWidth: view.layout === SearchViewLayout.BOARD ? 380 : undefined,
      }}
    >
      <Stack direction="row" p={1} alignItems="center">
        <Typography fontWeight={600} flex={1}>
          {group.label} ({group.total_results})
        </Typography>
        {config.renderGroupAction?.(group, onSelect)}
      </Stack>
      <Divider />
      <EntityResultList
        config={config}
        projectId={projectId}
        view={nestedView}
        searchQuery={searchQuery}
        groupKey={group.key}
        onSelect={onSelect}
      />
    </Paper>
  );
}
