# Cache-Sync (the "brain")

Cache-sync keeps every client's react-query cache consistent with the server
**without refetching**. It is the single place that knows how any change to
any entity affects the cache — whether that change was made by this user (a
mutation response) or by someone else (a websocket push).

## The core idea

> The backend returns the affected entity DTO from every mutation, and pushes
> that _same_ DTO as a websocket event to everyone else. One event contract,
> one handler.

Every change is a typed **DATS event** (`CODE_CREATED`, `MEMO_UPDATED`,
`JOB_UPDATED`, ...). The brain — `handleDATSEvent(event, source)` in
[brain.ts](brain.ts) — is one exhaustive `switch` over all of them. For each
event it:

1. **Writes entity caches directly** (`setQueryData`) — zero refetch.
2. **Invalidates derived caches** (search tables, statistics, filter-keyed
   views) — these can't be surgically written.

Because the mutation response and the websocket echo carry the identical DTO,
both funnel into the same handler and produce the identical, idempotent write.

## The two entry points

Both sources call the same `handleDATSEvent`:

| Source    | How it reaches the brain                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mutation  | The global `MutationCache` in [queryClient.ts](../queryClient.ts) reads `meta.datsEvent` and forwards the response `data` on success.              |
| Websocket | [websocketEventHandlers.ts](../../plugins/websocket/websocketEventHandlers.ts) is a thin dispatcher that forwards every pushed event to the brain. |

### Mutations: tag with `meta.datsEvent`

A plain CRUD mutation needs **no `onSuccess` cache logic** — just a meta tag:

```ts
useMutation({
  mutationFn: CodeService.create,
  meta: { datsEvent: "CODE_CREATED", successMessage: "Created code" },
});
```

The meta is typed via `DATSEventMeta` in
[mutationMeta.ts](../../plugins/tanstack/mutationMeta.ts) (a `Register`
module augmentation), so `datsEvent` only accepts valid event names.

**Keep an explicit `onSuccess`** (calling `handleDATSEvent` or the cache
helpers directly) when the reaction can't be expressed as a single static
event tag:

- The payload differs from the event DTO (e.g. `useCreateApiKey` strips the
  plaintext key before caching).
- The cache target depends on the request `variables`, not just the response
  (e.g. `useDeleteDocuments`).
- RPC-style mutations (search, chat, exports) that don't map to an entity event.

**Optimistic updates stay in the hooks.** `onMutate` / `onError` rollback for
annotations and search views is untouched — the brain only handles the
server-confirmed write.

### Websocket events

The backend pushes `{ type, payload }` messages. The dispatcher forwards them
verbatim; the brain handles them exactly like a mutation result. No
per-event handler code is needed in the websocket layer.

## The event contract is generated

The set of events is not hand-maintained on the frontend. The backend declares
every event and its payload type in `backend/src/common/dats_event.py` and
exposes them as OpenAPI webhooks. `just update-api` regenerates
[src/models/datsEvents.ts](../../../models/datsEvents.ts), which exports:

- `DATSEventMap` — event name → payload DTO type.
- `DATSEvent` — the discriminated union the brain switches over.

The brain's `switch` has an exhaustive `never` check, so **adding an event on
the backend produces a compile error in the brain until a case is added** —
the type system forces the cache reaction to be defined.

## Cache-write helpers

Per-event logic builds on shared primitives in [\_utils/](_utils):

- [cacheWriterUtils.ts](_utils/cacheWriterUtils.ts) — generic `upsertMapItem`
  / `removeMapItem` / `upsertListItem` / `setSingle` / `sweepPrefix` for the
  `Record<id, T>` maps, arrays, and single-entity caches.
- [jobCacheUtils.ts](_utils/jobCacheUtils.ts) — `writeJobUpdate`: the
  per-job-type switch + finished-job derived-data invalidations.
- [memoCacheUtils.ts](_utils/memoCacheUtils.ts),
  [sentenceAnnoCacheUtils.ts](_utils/sentenceAnnoCacheUtils.ts),
  [sdocMetadataCacheUtils.ts](_utils/sdocMetadataCacheUtils.ts) — entity-specific
  write/invalidation logic (e.g. per-sentence regrouping of annotation results).

## Rules

1. **Entity caches are written, never invalidated.** Derived/search/statistics
   caches are invalidated, never written.
2. **No entity cache writes outside the brain.** This is governance rule 5 in
   [QueryKey.ts](../hooks/QueryKey.ts). If you find a `setQueryData` reacting
   to an entity change elsewhere, it belongs here.
3. **Prefer the meta tag** over an explicit `onSuccess` whenever the response
   payload matches the event DTO.
4. **DB cascades need explicit invalidation.** The frontend can't observe a
   backend cascade (e.g. deleting a code deletes its annotations), so the
   brain invalidates the affected derived caches for that event.

## Adding a new entity event

1. Backend: add the `DATSEvent` member + payload and emit it (see the
   [websocket system](../../../../backend/src/systems/websocket_system/README.md)).
2. Run `just update-api` — regenerates `datsEvents.ts`.
3. Add a `case` in [brain.ts](brain.ts) (the compiler forces this) — write the
   entity caches, invalidate the derived ones.
4. Tag the mutation with `meta.datsEvent` (or an explicit `handleDATSEvent`
   call if the payload differs).
