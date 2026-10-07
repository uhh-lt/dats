import { queryClient } from "@api/queryClient";
import type { DataTag, QueryKey } from "@tanstack/react-query";

/**
 * A key produced by a query factory (`xxxQueries.foo(...).queryKey`) is tagged with the
 * data type of its query. The overloads below use that tag so the item/updater types are
 * checked against the cached data type.
 *
 * TODO: the untyped `QueryKey` overloads only exist for keys that are not yet migrated to
 * query factories. Remove them in the final migration phase.
 */
type TaggedKey<TData> = DataTag<QueryKey, TData, Error>;

/**
 * Generic cache-write primitives shared by the entity-event brain and the
 * per-entity invalidation utils. Entity caches are WRITTEN (zero refetch);
 * derived/search/statistics caches are INVALIDATED (they can't be surgically
 * written).
 */

/** Upsert an item into a `Record<id, T>` map cache. */
export function upsertMapItem<T extends { id: number }>(queryKey: TaggedKey<Record<number, T>>, item: T): void;
export function upsertMapItem<T extends { id: number }>(queryKey: QueryKey, item: T): void;
export function upsertMapItem<T extends { id: number }>(queryKey: QueryKey, item: T): void {
  queryClient.setQueryData<Record<number, T>>(queryKey, (old) =>
    old ? { ...old, [item.id]: item } : { [item.id]: item },
  );
}

/** Remove an item from a `Record<id, T>` map cache. */
export function removeMapItem(queryKey: TaggedKey<Record<number, unknown>>, id: number): void;
export function removeMapItem(queryKey: QueryKey, id: number): void;
export function removeMapItem(queryKey: QueryKey, id: number): void {
  queryClient.setQueryData<Record<number, unknown>>(queryKey, (old) => {
    if (!old) return old;
    const next = { ...old };
    delete next[id];
    return next;
  });
}

/** Append an item to an array cache. */
export function appendListItem<T extends { id: number }>(queryKey: TaggedKey<T[]>, item: T): void;
export function appendListItem<T extends { id: number }>(queryKey: QueryKey, item: T): void;
export function appendListItem<T extends { id: number }>(queryKey: QueryKey, item: T): void {
  queryClient.setQueryData<T[]>(queryKey, (old) => (old ? [...old, item] : [item]));
}

/** Replace an item in an array cache (match by id). */
export function replaceListItem<T extends { id: number }>(queryKey: TaggedKey<T[]>, item: T): void;
export function replaceListItem<T extends { id: number }>(queryKey: QueryKey, item: T): void;
export function replaceListItem<T extends { id: number }>(queryKey: QueryKey, item: T): void {
  queryClient.setQueryData<T[]>(queryKey, (old) =>
    old ? old.map((existing) => (existing.id === item.id ? item : existing)) : old,
  );
}

/** Remove an item from an array cache. */
export function removeListItem(queryKey: TaggedKey<{ id: number }[]>, id: number): void;
export function removeListItem(queryKey: QueryKey, id: number): void;
export function removeListItem(queryKey: QueryKey, id: number): void {
  queryClient.setQueryData<{ id: number }[]>(queryKey, (old) =>
    old ? old.filter((existing) => existing.id !== id) : old,
  );
}

/** Write a single-entity cache. */
export function setSingle<T>(queryKey: TaggedKey<T>, item: T): void;
export function setSingle<T>(queryKey: QueryKey, item: T): void;
export function setSingle<T>(queryKey: QueryKey, item: T): void {
  queryClient.setQueryData<T>(queryKey, item);
}

/** Drop a single-entity cache. */
export function removeSingle(queryKey: QueryKey): void {
  queryClient.removeQueries({ queryKey });
}

/** Apply `updater` to every cached query whose key starts with `queryKey`. */
export function sweepPrefix<T>(queryKey: QueryKey, updater: (old: T | undefined) => T | undefined): void {
  queryClient
    .getQueryCache()
    .findAll({ queryKey })
    .forEach((query) => {
      queryClient.setQueryData<T>(query.queryKey, updater);
    });
}
