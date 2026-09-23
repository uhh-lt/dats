import { queryClient } from "@api/queryClient";

/**
 * Generic cache-write primitives shared by the entity-event brain and the
 * per-entity invalidation utils. Entity caches are WRITTEN (zero refetch);
 * derived/search/statistics caches are INVALIDATED (they can't be surgically
 * written).
 */

/** Upsert an item into a project-scoped `Record<id, T>` map cache. */
export function upsertMapItem<T extends { id: number }>(key: string, projectId: number, item: T): void {
  queryClient.setQueryData<Record<number, T>>([key, projectId], (old) =>
    old ? { ...old, [item.id]: item } : { [item.id]: item },
  );
}

/** Remove an item from a project-scoped `Record<id, T>` map cache. */
export function removeMapItem(key: string, projectId: number, id: number): void {
  queryClient.setQueryData<Record<number, unknown>>([key, projectId], (old) => {
    if (!old) return old;
    const next = { ...old };
    delete next[id];
    return next;
  });
}

/** Append an item to a project-scoped array cache. */
export function appendListItem<T extends { id: number }>(key: string, projectId: number, item: T): void {
  queryClient.setQueryData<T[]>([key, projectId], (old) => (old ? [...old, item] : [item]));
}

/** Replace an item in a project-scoped array cache (match by id). */
export function replaceListItem<T extends { id: number }>(key: string, projectId: number, item: T): void {
  queryClient.setQueryData<T[]>([key, projectId], (old) =>
    old ? old.map((existing) => (existing.id === item.id ? item : existing)) : old,
  );
}

/** Remove an item from a project-scoped array cache. */
export function removeListItem<T extends { id: number }>(key: string, projectId: number, id: number): void {
  queryClient.setQueryData<T[]>([key, projectId], (old) => (old ? old.filter((existing) => existing.id !== id) : old));
}

/** Write a single-entity cache keyed by id. */
export function setSingle<T>(key: string, id: number, item: T): void {
  queryClient.setQueryData<T>([key, id], item);
}

/** Drop a single-entity cache keyed by id. */
export function removeSingle(key: string, id: number): void {
  queryClient.removeQueries({ queryKey: [key, id] });
}

/** Apply `updater` to every cached query whose key starts with `key`. */
export function sweepPrefix<T>(key: string, updater: (old: T | undefined) => T | undefined): void {
  queryClient
    .getQueryCache()
    .findAll({ queryKey: [key] })
    .forEach((query) => {
      queryClient.setQueryData<T>(query.queryKey, updater);
    });
}
