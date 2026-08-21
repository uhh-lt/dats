import { SearchViewLayout } from "@models/SearchViewLayout";
import { Alert } from "@mui/material";
import { ReactNode } from "react";
import { EntityWorkspaceConfig } from "../../types/EntityWorkspaceConfig";
import { WorkspaceView } from "../../types/WorkspaceGeneratedTypes";
import { EntityResultList } from "./_components/EntityResultList";
import { GroupedResults } from "./_components/GroupedResults";

interface WorkspaceResultsProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  projectId: number;
  view: WorkspaceView<TColumns>;
  searchQuery: string;
  onSelect: (id: number) => void;
}

/** Routes between flat results and grouped results based on the view's grouping. */
export function WorkspaceResults<TColumns extends string, TRow extends { id: number }>({
  config,
  projectId,
  view,
  searchQuery,
  onSelect,
}: WorkspaceResultsProps<TColumns, TRow>): ReactNode {
  if (view.layout === SearchViewLayout.BOARD && !view.group_by)
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Choose a grouping to display this board.
      </Alert>
    );
  if (view.group_by)
    return (
      <GroupedResults config={config} projectId={projectId} view={view} searchQuery={searchQuery} onSelect={onSelect} />
    );
  return (
    <EntityResultList config={config} projectId={projectId} view={view} searchQuery={searchQuery} onSelect={onSelect} />
  );
}
