import { SearchViewLayout } from "@models/SearchViewLayout";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { WorkspaceResults } from "./_components/results/WorkspaceResults";
import { WorkspaceToolbar } from "./_components/toolbar/WorkspaceToolbar";
import { useWorkspaceViews } from "./_hooks/useWorkspaceViews";
import { EntityWorkspaceConfig } from "./types/EntityWorkspaceConfig";

export interface EntityWorkspaceProps<TColumns extends string, TRow extends { id: number }> {
  projectId: number;
  config: EntityWorkspaceConfig<TColumns, TRow>;
  /** Called when a row is clicked. What happens next (e.g. detail navigation) is the feature's concern. */
  onSelect: (id: number) => void;
  /** Persisted last-active view id (from the feature's preference slice). */
  lastViewId?: number;
  onRememberView: (viewId?: number) => void;
}

/**
 * A generic, entity-agnostic workspace: saved views (chips), a toolbar with
 * layout/filter/sort/group/search, and grouped or flat results rendered through
 * the entity's config.
 */
export function EntityWorkspace<TColumns extends string, TRow extends { id: number }>({
  projectId,
  config,
  onSelect,
  lastViewId,
  onRememberView,
}: EntityWorkspaceProps<TColumns, TRow>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expertMode, setExpertMode] = useState(false);

  const {
    views,
    activeView,
    activeViewId,
    viewsQuery,
    updateView,
    handleSelectView,
    handleReorderViews,
    handleCreateView,
    handleDebouncedUpdate,
    handleDeleteView,
    handleRenameView,
  } = useWorkspaceViews({ projectId, config, lastViewId, onRememberView });

  const { data: columnInfo } = config.useSearchInfo(projectId);

  const handleSelectViewAndResetSearch = useCallback(
    (viewId: number) => {
      handleSelectView(viewId);
      setSearchQuery("");
    },
    [handleSelectView],
  );

  return (
    <Box sx={{ height: "100%", bgcolor: "background.paper" }}>
      <Stack height="100%" minWidth={0}>
        <WorkspaceToolbar
          config={config}
          views={views}
          view={activeView}
          activeViewId={activeViewId}
          searchQuery={searchQuery}
          expertMode={expertMode}
          columnInfo={columnInfo}
          isRenaming={updateView.isPending}
          onSelectView={handleSelectViewAndResetSearch}
          onReorderViews={handleReorderViews}
          onCreateView={handleCreateView}
          onRenameView={handleRenameView}
          onDeleteView={handleDeleteView}
          onSearchQueryChange={setSearchQuery}
          onExpertModeChange={setExpertMode}
          onUpdate={handleDebouncedUpdate}
        />
        {activeView ? (
          <WorkspaceResults
            config={config}
            projectId={projectId}
            view={activeView}
            searchQuery={searchQuery}
            onSelect={onSelect}
          />
        ) : viewsQuery.isLoading ? (
          <CircularProgress sx={{ m: "auto" }} />
        ) : (
          <Stack alignItems="center" justifyContent="center" spacing={2} flex={1}>
            <Typography variant="h5">Build your {config.entityLabel} workspace</Typography>
            <Typography color="text.secondary">
              Create a view to organize every {config.entityLabel} in this project.
            </Typography>
            <Button
              variant="contained"
              onClick={() =>
                handleCreateView(`All ${config.entityLabel}`, config.templates[0]?.layout ?? SearchViewLayout.TABLE)
              }
            >
              Create All {config.entityLabel} view
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
