import { ReactNode, useEffect } from "react";
import { EntityWorkspaceConfig } from "../../../types/EntityWorkspaceConfig";
import { WorkspaceView } from "../../../types/WorkspaceGeneratedTypes";

const PAGE_SIZE = 50;

interface GroupSubRowsFetcherProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  projectId: number;
  view: WorkspaceView<TColumns>;
  searchQuery: string;
  groupKey: string;
  /** Register this group's sub-row state with the parent table. */
  onRegister: (args: {
    groupKey: string;
    data: ReturnType<EntityWorkspaceConfig<TColumns, TRow>["useQueryRows"]>["data"];
    isFetching: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => void;
  }) => void;
  onUnregister: (groupKey: string) => void;
}

/**
 * Runs one lazy infinite `useQueryRows(group_key)` for a single expanded group and reports the
 * result up to the flat MRT table. Renders nothing. Unmounting (collapse) unregisters the group.
 */
export function GroupSubRowsFetcher<TColumns extends string, TRow extends { id: number }>({
  config,
  projectId,
  view,
  searchQuery,
  groupKey,
  onRegister,
  onUnregister,
}: GroupSubRowsFetcherProps<TColumns, TRow>): ReactNode {
  const query = config.useQueryRows(
    {
      project_id: projectId,
      search_query: searchQuery,
      filter: view.filters,
      sorts: view.sorts,
      group_by: view.group_by,
      group_key: groupKey,
      page_size: PAGE_SIZE,
    },
    true,
  );

  const { data, isFetching, hasNextPage, fetchNextPage } = query;

  useEffect(() => {
    onRegister({ groupKey, data, isFetching, hasNextPage: hasNextPage ?? false, fetchNextPage });
  }, [groupKey, data, isFetching, hasNextPage, fetchNextPage, onRegister]);

  useEffect(() => () => onUnregister(groupKey), [groupKey, onUnregister]);

  return null;
}
