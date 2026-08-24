import { SearchViewLayout } from "@models/SearchViewLayout";
import { Alert, Box } from "@mui/material";
import { ReactNode } from "react";
import { EntityWorkspaceConfig } from "../../types/EntityWorkspaceConfig";
import { WorkspaceView } from "../../types/WorkspaceGeneratedTypes";
import { EntityResultList } from "./_components/EntityResultList";
import { GroupedResults } from "./_components/GroupedResults";
import { TableResults } from "./_components/TableResults";

interface WorkspaceResultsProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  projectId: number;
  view: WorkspaceView<TColumns>;
  searchQuery: string;
  onSelect: (id: number) => void;
  expandedGroups?: Record<number, string[]>;
  onToggleGroup: (viewId: number, groupKey: string, expanded: boolean, allGroupKeys: string[]) => void;
  columnSizing?: Record<number, Record<string, number>>;
  onColumnSizingChange: (viewId: number, columnSizing: Record<string, number>) => void;
}

/** Routes between flat results and grouped results based on the view's grouping. */
export function WorkspaceResults<TColumns extends string, TRow extends { id: number }>({
  config,
  projectId,
  view,
  searchQuery,
  onSelect,
  expandedGroups,
  onToggleGroup,
  columnSizing,
  onColumnSizingChange,
}: WorkspaceResultsProps<TColumns, TRow>): ReactNode {
  if (view.layout === SearchViewLayout.BOARD && !view.group_by)
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Choose a grouping to display this board.
      </Alert>
    );
  if (view.layout === SearchViewLayout.TABLE)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <TableResults
          config={config}
          projectId={projectId}
          view={view}
          searchQuery={searchQuery}
          onSelect={onSelect}
          expandedGroups={expandedGroups}
          onToggleGroup={onToggleGroup}
          columnSizing={columnSizing}
          onColumnSizingChange={onColumnSizingChange}
        />
      </Box>
    );
  if (view.group_by)
    return (
      <GroupedResults
        config={config}
        projectId={projectId}
        view={view}
        searchQuery={searchQuery}
        onSelect={onSelect}
        expandedGroups={expandedGroups}
        onToggleGroup={onToggleGroup}
      />
    );
  return (
    <EntityResultList config={config} projectId={projectId} view={view} searchQuery={searchQuery} onSelect={onSelect} />
  );
}
