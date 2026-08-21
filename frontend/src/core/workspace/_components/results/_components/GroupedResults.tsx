import { SearchViewLayout } from "@models/SearchViewLayout";
import { CircularProgress, Stack } from "@mui/material";
import { ReactNode } from "react";
import { EntityWorkspaceConfig } from "../../../types/EntityWorkspaceConfig";
import { WorkspaceView } from "../../../types/WorkspaceGeneratedTypes";
import { EntityGroup } from "./EntityGroup";

interface GroupedResultsProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  projectId: number;
  view: WorkspaceView<TColumns>;
  searchQuery: string;
  onSelect: (id: number) => void;
}

/** Renders the groups of a grouped view: a column of groups, or a row of columns for BOARD. */
export function GroupedResults<TColumns extends string, TRow extends { id: number }>({
  config,
  projectId,
  view,
  searchQuery,
  onSelect,
}: GroupedResultsProps<TColumns, TRow>): ReactNode {
  const groupBy = view.group_by;
  const query = config.useQueryGroups(
    {
      project_id: projectId,
      search_query: searchQuery,
      filter: view.filters,
      group_by: groupBy ?? { field: config.columns[Object.keys(config.columns)[0] as TColumns] },
      page_size: 100,
    },
    Boolean(groupBy),
  );
  const groups = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (query.isLoading) return <CircularProgress sx={{ m: 2 }} />;
  return (
    <Stack
      direction={view.layout === SearchViewLayout.BOARD ? "row" : "column"}
      spacing={2}
      p={2}
      overflow="auto"
      alignItems="flex-start"
    >
      {groups.map((group) => (
        <EntityGroup
          key={group.key}
          group={group}
          config={config}
          projectId={projectId}
          view={view}
          searchQuery={searchQuery}
          onSelect={onSelect}
        />
      ))}
    </Stack>
  );
}
