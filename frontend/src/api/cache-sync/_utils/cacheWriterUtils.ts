import { queryClient } from "@api/queryClient";

/**
 * Generic cache-write primitives shared by the entity-event brain and the
 * per-entity invalidation utils. Entity caches are WRITTEN (zero refetch);
 * derived/search/statistics caches are INVALIDATED (they can't be surgically
 * written).
 */

/** Upsert an item into a `Record<id, T>` map cache. */
export function upsertMapItem<T extends { id: number }>(queryKey: readonly unknown[], item: T): void {
  queryClient.setQueryData<Record<number, T>>(queryKey, (old) =>
    old ? { ...old, [item.id]: item } : { [item.id]: item },
  );
}

/** Remove an item from a `Record<id, T>` map cache. */
export function removeMapItem(queryKey: readonly unknown[], id: number): void {
  queryClient.setQueryData<Record<number, unknown>>(queryKey, (old) => {
    if (!old) return old;
    const next = { ...old };
    delete next[id];
    return next;
  });
}

/** Append an item to an array cache. */
export function appendListItem<T extends { id: number }>(queryKey: readonly unknown[], item: T): void {
  queryClient.setQueryData<T[]>(queryKey, (old) => (old ? [...old, item] : [item]));
}

/** Replace an item in an array cache (match by id). */
export function replaceListItem<T extends { id: number }>(queryKey: readonly unknown[], item: T): void {
  queryClient.setQueryData<T[]>(queryKey, (old) =>
    old ? old.map((existing) => (existing.id === item.id ? item : existing)) : old,
  );
}

/** Remove an item from an array cache. */
export function removeListItem(queryKey: readonly unknown[], id: number): void {
  queryClient.setQueryData<{ id: number }[]>(queryKey, (old) =>
    old ? old.filter((existing) => existing.id !== id) : old,
  );
}

/** Write a single-entity cache. */
export function setSingle<T>(queryKey: readonly unknown[], item: T): void {
  queryClient.setQueryData<T>(queryKey, item);
}

/** Drop a single-entity cache. */
export function removeSingle(queryKey: readonly unknown[]): void {
  queryClient.removeQueries({ queryKey });
}

/** Apply `updater` to every cached query whose key starts with `queryKey`. */
export function sweepPrefix<T>(queryKey: readonly unknown[], updater: (old: T | undefined) => T | undefined): void {
  queryClient
    .getQueryCache()
    .findAll({ queryKey })
    .forEach((query) => {
      queryClient.setQueryData<T>(query.queryKey, updater);
    });
}
