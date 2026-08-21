import { useOpenConfirmationDialog } from "@core/notification";
import { SearchViewLayout } from "@models/SearchViewLayout";
import { useCallback, useMemo, useRef, useState } from "react";
import { EntityWorkspaceConfig } from "../types/EntityWorkspaceConfig";
import {
  WorkspaceGroupConfig,
  WorkspaceSort,
  WorkspaceView,
  WorkspaceViewUpdate,
} from "../types/WorkspaceGeneratedTypes";

interface UseWorkspaceViewsParams<TColumns extends string, TRow extends { id: number }> {
  projectId: number;
  config: EntityWorkspaceConfig<TColumns, TRow>;
  /** Persisted id of the last-active view (from the feature's preference slice). */
  lastViewId?: number;
  /** Called when the active view changes so the feature can persist it. */
  onRememberView: (viewId?: number) => void;
}

/**
 * Owns all view-management state and behavior for an `EntityWorkspace`:
 * fetching/sorting views, the active-view selection (reconciled during render),
 * create/rename/delete, reorder, and the debounced + serialized update queue.
 */
export function useWorkspaceViews<TColumns extends string, TRow extends { id: number }>({
  projectId,
  config,
  lastViewId,
  onRememberView,
}: UseWorkspaceViewsParams<TColumns, TRow>) {
  const openConfirmationDialog = useOpenConfirmationDialog();
  const viewHooks = config.useSearchViews;
  const viewsQuery = viewHooks.useGetViews(projectId);
  const createView = viewHooks.useCreateView();
  const updateView = viewHooks.useUpdateView();
  const { mutate: reorderViewOrder } = viewHooks.useReorderViews(projectId);
  const deleteView = viewHooks.useDeleteView();

  const [activeViewId, setActiveViewId] = useState<number>();
  const updateTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingUpdate = useRef<WorkspaceViewUpdate<TColumns>>({});
  const updateQueue = useRef(Promise.resolve());

  const views = useMemo(
    () =>
      [...((viewsQuery.data ?? []) as WorkspaceView<TColumns>[])].sort(
        (left, right) => left.position - right.position || left.id - right.id,
      ),
    [viewsQuery.data],
  );
  const activeView = views.find((view) => view.id === activeViewId);

  // Adjust the active view during rendering when the current selection is invalid
  // (views not loaded yet, or the active view was deleted). See https://react.dev/learn/you-might-not-need-an-effect
  if (activeViewId === undefined || !views.some((view) => view.id === activeViewId)) {
    const fallbackViewId = (views.find((view) => view.id === lastViewId) ?? views[0])?.id;
    if (fallbackViewId !== activeViewId) {
      setActiveViewId(fallbackViewId);
    }
  }

  const handleSelectView = useCallback(
    (viewId: number) => {
      setActiveViewId(viewId);
      onRememberView(viewId);
    },
    [onRememberView],
  );

  const handleReorderViews = useCallback(
    (viewIds: number[]) => {
      reorderViewOrder({ projectId, entityType: config.entityType, requestBody: { view_ids: viewIds } });
    },
    [projectId, config.entityType, reorderViewOrder],
  );

  const handleCreateView = useCallback(
    (
      name: string,
      layout: SearchViewLayout,
      filters = config.emptyFilter(),
      groupBy?: WorkspaceGroupConfig<TColumns> | null,
      sorts?: WorkspaceSort<TColumns>[],
    ) => {
      const usedNames = new Set(views.map((view) => view.name.toLocaleLowerCase()));
      let uniqueName = name;
      let suffix = 2;
      while (usedNames.has(uniqueName.toLocaleLowerCase())) uniqueName = `${name} ${suffix++}`;
      createView.mutate(
        {
          requestBody: { project_id: projectId, name: uniqueName, layout, filters, group_by: groupBy, sorts },
        } as Parameters<typeof createView.mutate>[0],
        { onSuccess: (view) => handleSelectView(view.id) },
      );
    },
    [createView, config, handleSelectView, projectId, views],
  );

  const handleDebouncedUpdate = useCallback(
    (requestBody: WorkspaceViewUpdate<TColumns>) => {
      if (!activeView) return;
      pendingUpdate.current = { ...pendingUpdate.current, ...requestBody };
      clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(() => {
        const update = pendingUpdate.current;
        pendingUpdate.current = {};
        updateQueue.current = updateQueue.current
          .then(() =>
            updateView.mutateAsync({
              viewId: activeView.id,
              requestBody: update,
            } as Parameters<typeof updateView.mutateAsync>[0]),
          )
          .then(
            () => undefined,
            () => undefined,
          );
      }, 400);
    },
    [activeView, updateView],
  );

  const handleDeleteView = useCallback(() => {
    if (!activeView) return;
    const view = activeView;
    openConfirmationDialog({
      type: "DELETE",
      text: `Do you really want to delete the view "${view.name}"? This action cannot be undone!`,
      onAccept: () => {
        deleteView.mutate({ viewId: view.id }, { onSuccess: () => setActiveViewId(undefined) });
      },
    });
  }, [activeView, deleteView, openConfirmationDialog]);

  const handleRenameView = useCallback(
    (name: string, onSuccess?: () => void) => {
      if (!activeView || name === activeView.name) return;
      updateView.mutate({ viewId: activeView.id, requestBody: { name } } as Parameters<typeof updateView.mutate>[0], {
        onSuccess,
      });
    },
    [activeView, updateView],
  );

  return {
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
  };
}
