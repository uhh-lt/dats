import { queryClient } from "@api/queryClient";
import type { DataTag, QueryKey } from "@tanstack/react-query";

/**
 * Roll back an optimistic cache update after its mutation failed.
 *
 * Several mutations of the same kind can be in flight at once (e.g. the user drags two annotations quickly).
 * Restoring the snapshot taken before the failed mutation would also erase the optimistic update of the others.
 * So the snapshot is only restored when this is the only mutation of its kind that is still running
 * (`isMutating` still counts the failed mutation itself, hence `=== 1`). Otherwise the data is only marked
 * stale (no refetch now, so the other optimistic updates stay visible) and is refreshed the next time it is used.
 * See "Concurrent Optimistic Updates in React Query" (TkDodo).
 *
 * @param queryKey the typed key of the optimistically updated cache entry
 * @param previous the snapshot taken in `onMutate`
 * @param mutationKey prefix of the mutation keys that update this cache entry
 */
export function rollbackOptimisticUpdate<TData>(
  queryKey: DataTag<QueryKey, TData, Error>,
  previous: TData | undefined,
  mutationKey: QueryKey,
): void {
  if (queryClient.isMutating({ mutationKey }) === 1) {
    queryClient.setQueryData(queryKey, previous);
    return;
  }
  queryClient.invalidateQueries({ queryKey, refetchType: "none" });
}
