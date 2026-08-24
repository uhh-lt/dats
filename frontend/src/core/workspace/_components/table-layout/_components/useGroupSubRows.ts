import { InfiniteData } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { WorkspacePage } from "../../../types/WorkspaceGeneratedTypes";

/** Pagination/loading state for one expanded group's sub-rows. */
export interface GroupSubRowsState<TRow> {
  rows: TRow[];
  totalResults: number;
  isFetching: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

export type GroupSubRowsRegistry<TRow> = Record<string, GroupSubRowsState<TRow>>;

interface RegisterArgs<TRow> {
  groupKey: string;
  data: InfiniteData<WorkspacePage<TRow>> | undefined;
  isFetching: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

/**
 * Collects the sub-row query state of every expanded group into a single registry keyed by
 * group key, so the flat MRT table can read each group's `subRows` synchronously at render time.
 *
 * Each expanded group renders a `GroupSubRowsFetcher` child that runs its own infinite
 * `useQueryRows(group_key)` and reports up through `register`. This keeps one lazy infinite
 * query per group (no backend change) while giving MRT a synchronous tree.
 */
export function useGroupSubRows<TRow extends { id: number }>() {
  const [registry, setRegistry] = useState<GroupSubRowsRegistry<TRow>>({});

  const register = useCallback(({ groupKey, data, isFetching, hasNextPage, fetchNextPage }: RegisterArgs<TRow>) => {
    const rows = data?.pages.flatMap((page) => page.items) ?? [];
    const totalResults = data?.pages?.[0]?.total_results ?? 0;
    setRegistry((prev) => {
      const existing = prev[groupKey];
      // Skip the update when nothing meaningful changed (compared by content size, since the
      // flattened array is rebuilt each call). `data` identity is stable across renders, so this
      // effect only fires on real changes; this guard just avoids redundant registry writes.
      if (
        existing &&
        existing.rows.length === rows.length &&
        existing.totalResults === totalResults &&
        existing.isFetching === isFetching &&
        existing.hasNextPage === hasNextPage
      ) {
        return prev;
      }
      return { ...prev, [groupKey]: { rows, totalResults, isFetching, hasNextPage, fetchNextPage } };
    });
  }, []);

  const unregister = useCallback((groupKey: string) => {
    setRegistry((prev) => {
      if (!(groupKey in prev)) return prev;
      const next = { ...prev };
      delete next[groupKey];
      return next;
    });
  }, []);

  return useMemo(() => ({ registry, register, unregister }), [registry, register, unregister]);
}
