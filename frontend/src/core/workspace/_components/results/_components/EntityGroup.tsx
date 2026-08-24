import { GroupSummary } from "@models/GroupSummary";
import { SearchViewLayout } from "@models/SearchViewLayout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { Box, Collapse, Divider, IconButton, Paper, Stack, Typography } from "@mui/material";
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
  /** Whether the group is expanded. Ignored for BOARD layout. */
  expanded: boolean;
  onToggle: (expanded: boolean) => void;
}

/**
 * One group in a grouped view. BOARD renders a lane card with eagerly fetched rows; all other
 * layouts render a collapsible Notion-style header (toggle, label, muted count) whose rows are
 * only fetched while expanded.
 */
export function EntityGroup<TColumns extends string, TRow extends { id: number }>({
  group,
  config,
  projectId,
  view,
  searchQuery,
  onSelect,
  expanded,
  onToggle,
}: EntityGroupProps<TColumns, TRow>): ReactNode {
  const nestedView = { ...view, layout: view.layout === SearchViewLayout.BOARD ? SearchViewLayout.LIST : view.layout };

  if (view.layout === SearchViewLayout.BOARD) {
    return (
      <Paper variant="outlined" sx={{ minWidth: 320, maxWidth: 380 }}>
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

  return (
    <Box width="100%">
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconButton size="small" onClick={() => onToggle(!expanded)} aria-label="toggle group">
          {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
        </IconButton>
        <Typography fontWeight={600}>{group.label}</Typography>
        <Typography color="text.secondary">{group.total_results}</Typography>
        <Box flex={1} />
        {config.renderGroupAction?.(group, onSelect)}
      </Stack>
      <Collapse in={expanded}>
        <EntityResultList
          config={config}
          projectId={projectId}
          view={nestedView}
          searchQuery={searchQuery}
          groupKey={group.key}
          onSelect={onSelect}
          enabled={expanded}
        />
      </Collapse>
    </Box>
  );
}
