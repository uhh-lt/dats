# Plan: Query keys, query definitions, mutations and route prefetching (frontend)

Status: **Decisions made (section 6). Stages 0, 1, 2 and 3 done. Stage 4 next. Stage 6 (Queries + Mutations files in api/hooks) added at your request.**
Branch: `refactor/query-key-factories` (contains an uncommitted phase-1 prototype, see section 4).
Scope: `frontend/` only. The hey-api client migration is a separate effort (section 8).

---

## 1. Goal

Make query keys, query definitions, mutations and route prefetching in the DATS frontend follow one clear,
documented set of rules, based on TkDodo's (TanStack Query maintainer) recommendations, so that:

- a key is written exactly **once** and cannot drift between loader, component, brain and mutation code,
- cache reads/writes are **type-checked** (no `setQueryData<T>` guesses, no `as unknown as`),
- invalidation can target a whole domain/scope by **prefix**,
- route loaders and components can **not** disagree about what they fetch ("The Great Divergence").

## 2. How to read a query key (glossary)

A query key identifies one cached query, and TanStack matches keys **by prefix**.

| Term                | Meaning                                                                                       | Example                                               |
| ------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Key                 | Array that identifies a query                                                                 | `["tags", "project", 5]`                              |
| Prefix / scope      | The leading part of a key, used for invalidation                                              | `["tags", "project"]` matches all project tag queries |
| `queryOptions(...)` | An object that bundles `queryKey` + `queryFn` (+ cache settings)                              | `tagQueries.byProject(5)`                             |
| Factory             | A plain object of functions that return keys/options for one domain                           | `tagQueries`                                          |
| Tagged key          | `factory.leaf(x).queryKey`: carries the data type, so `getQueryData`/`setQueryData` are typed | `codeQueries.byProject(5).queryKey`                   |

Old style (still used for everything not yet migrated): `[QueryKey.PROJECT_TAGS, projectId]`, a string from the
`QueryKey` enum plus hand-written params, repeated at every call site.
New style: `tagQueries.byProject(projectId)` (options) or `.queryKey` (key only).

Key layout rule: **domain first, then scope, then params**, e.g. `["memos", "attached", type, id]`.

## 3. TkDodo's recommendations, condensed (sources in section 9)

His position changed over time. Only the **current** positions are used here.

1. **A key is a dependency array.** Everything the queryFn uses belongs in the key.
2. **Keys are hierarchical** (generic to specific), so prefixes can be invalidated.
3. **Key and queryFn live together** in `queryOptions` factories (Query Options API, 2024).
4. **Custom hooks are not the right abstraction** for queries (Creating Query Abstractions, Feb 2026): they only work
   in components, share config rather than logic, and lock you to `useQuery`. The superseded 2020 advice was
   "a custom hook even for a single useQuery".
5. **"The best abstractions are not configurable."** Factories take identity params only; `select`, `enabled`,
   `throwOnError` are composed at the call site: `useQuery({ ...factory(id), select })`.
6. **Types:** no explicit generics; type the queryFn. `getQueryData`/`setQueryData`/key matching are the unsafe
   zones, so access the cache through tagged keys. Prefer `skipToken` over `enabled` for dependent queries.
7. **Transformations:** prefer `select`; transforming in the queryFn is allowed but loses the raw shape.
8. **Mutations:** `mutate` over `mutateAsync`; necessary logic (invalidation) in the `useMutation` callbacks, not in
   `mutate` callbacks; return the invalidation promise from `onSuccess`; `mutationKey` for matching.
9. **Concurrent optimistic updates:** `cancelQueries` in `onMutate`; invalidate in `onSettled` only when
   `queryClient.isMutating({ mutationKey }) === 1`.
10. **Global handling:** `MutationCache` for global side effects + `meta`; `QueryCache.onError` only for failed
    background refetches.
11. **WebSockets:** he prefers invalidation to `setQueryData` (too dynamic, poorly typed); use `setQueryData` for
    small frequent partial updates; use a high `staleTime`. _(DATS deliberately deviates, see 5.5.)_
12. **Router (TanStack Router + Query):** `queryClient` in router context, `defaultPreloadStaleTime: 0`, loaders are
    fire-and-forget and only prime the cache, components always call a Query hook (never rely on `useLoaderData`).
13. **The Great Divergence** (Reliable Query Prefetching, Aug 2026): loader and component must use the _same_
    options object. Build the options once in the route `context` (from `params` + `loaderDeps`), call
    `ensureQueryData` in the loader, read them with `Route.useRouteContext()` in the component.

Not readable (page had no article text): _Thinking in React Query_, _API Design: Lessons Learned_, _The Bad Parts_.

## 4. Current state in DATS

Numbers from the audit (frontend/src):

- **79 keys** remain in the `QueryKey` enum (10 already migrated in the prototype). 306 `QueryKey.` references before the prototype.
- **Queries:** 124 `useQuery`, only ~23 `queryOptions(`, ~27 inline `useQuery({`, 56 uses of explicit generics (`useQuery<...>`).
- **Hook layer:** 21 `XxxHooks` objects; ~18 files with thin `useQuery` wrappers (partly hiding `useAppSelector(state => state.project.projectId)`).
- **Mutations:** 135 `useMutation`; `mutate` 86 vs `mutateAsync` 4 (good); **0 `mutationKey`**; manual optimistic `onMutate`/`onError` for span/bbox/sentence annotations and search views, without the `isMutating` rule.
- **Cache writes:** centralized in `api/cache-sync/brain.ts` (typed events, `meta.datsEvent`), but 26 other files still call `invalidateQueries`/`setQueryData`/`removeQueries` directly (components, slices, feature `_api` files).
- **QueryClient:** no `defaultOptions` (default `staleTime: 0`), 54 hand-set `staleTime`s, no `QueryCache` (no global handler for failed background refetches).
- **Router:** `queryClient` in context and `defaultPreloadStaleTime: 0` are in place. About 19 loaders live in separate `*ViewLoader.ts` files that rebuild query options from route params; only 5 routes declare `loaderDeps`; some loaders return data (e.g. whiteboard title for tab `getTitle`).
- **Great Divergence is live:** `documentSearchViewLoader.ts:33` does not pass `showFolders`, `DocumentSearchView.tsx:53` does (from Redux). `showFolders` is part of the key (default `true`), so with `showFolders = false` the loader prefetches a key the component never reads. Other search routes need the same check.
- **Tests:** there is no frontend test setup (no vitest/msw in `package.json`). `AGENTS.md` forbids installing dependencies, so adding tests needs your approval.

### Phase-1 prototype (uncommitted, on this branch)

Done: `api/queries/{code,tag,memo}Queries.ts` (hierarchical keys, `queryOptions` leaves, `skipToken`), brain / cache utils /
whiteboard loader / document search use tagged keys, `cacheWriterUtils` has typed overloads, 10 enum keys removed.
`tsc`, eslint and prettier pass. It caught a real typing bug.

Known problems with it (all fixed in stage 2, except the loose `cacheWriterUtils` overload, which is removed in stage 7):

- It is **only** codes/tags/memos. Everything else, including the **search route**, still uses the enum. Two systems coexist until stage 7, which is why the search route looks "not migrated".
- Mutations and remaining wrapper hooks are still in `TagHooks.ts`/`MemoHooks.ts`/`CodeHooks.ts`, so a domain is split across two files.
- Hooks still add `enabled` on top of `skipToken` (duplicate).
- `cacheWriterUtils` keeps a loose untyped overload for not-yet-migrated keys (weakens safety until stage 7).
- No `mutationKey`s, no route integration.

## 5. Rules (proposed; become the project convention)

5.1 **One factory per domain, no React in it.** `frontend/src/api/queries/<domain>Queries.ts` exports `all()`, scope
prefixes (`xxxScope()`), and `queryOptions` leaves. Keys: domain, scope, params. Safe to import from loaders,
components and the cache-sync brain.
**Responsibility split (adjusted in stage 2):** `<domain>Queries.ts` = _what_ we fetch (pure key + queryFn, usable
anywhere, also outside React). `<Domain>Hooks.ts` (existing name/convention) = _React usage_: the domain's
mutation hooks and hooks that derive data (lookup/filter via `select`). Hooks that only forward to `useQuery` are removed.

5.2 **Factories take identity params only.** No `enabled`, `select`, `staleTime` parameters.
**No twins (decided after stage 3):** `useSuspenseQuery` and route loaders do not accept `skipToken`. So a query that is
used by suspense or loaders takes a strict id (`sdocQueries.detail(sdocId: number)`, `whiteboardQueries.byProject(projectId: number)`)
with a normal `queryFn`, and the few call sites that may have no id add `enabled` themselves (as the original code did).
Queries that no suspense/loader uses may still use `skipToken` for a missing id.

5.3 **Compose at the call site:** `useQuery({ ...tagQueries.byProject(id), select })`. A wrapper hook is allowed only if it
adds real logic (derived data, several queries, reading app state). A hook that only forwards to `useQuery` is not
allowed. _(Open decision D1: how components get the current `projectId`.)_

5.4 **No explicit generics** on `useQuery`/`queryOptions`/`setQueryData`; type the service call. All cache access goes through
`factory.leaf(...).queryKey` (tagged) or a scope prefix function.

5.5 **Cache shape transforms in the queryFn** (e.g. `CodeMap`) are allowed only when the brain relies on that shape; comment why.
**The brain keeps writing entity DTOs with `setQueryData`** (deliberate deviation from TkDodo's invalidation-first advice, see
`plan_entity_brain.md`); typed keys address his type-safety objection. Derived data is invalidated.

5.6 **Mutations:** stay in the domain's `<Domain>Hooks.ts` (renaming to `*Mutations.ts` would force changing every call
site for no benefit). Every mutation has a `mutationKey` starting with the domain, e.g. `["tags", "create"]`.
Cache reactions go through the brain via `meta.datsEvent`; no cache code in components. `mutate` by default,
`mutateAsync` only for dependent/concurrent mutations. Necessary logic in `useMutation` callbacks, UI actions in
`mutate` callbacks. Optimistic updates: `cancelQueries` in `onMutate`, rollback in `onError`, invalidate in `onSettled`
only when `isMutating({ mutationKey }) === 1`.

5.7 **Routes:** a route builds each query's options **once** in `context` from `params` + `loaderDeps`; the loader only
primes the cache (`ensureQueryData`/`prefetch*`, no returned data); components read the options with `Route.useRouteContext()`
and always call a Query hook. Any state that affects a query's key must be route state (params/search), not Redux.
Loader/component both consuming the same options object is the fix for the Great Divergence.

5.8 **Defaults:** keep the current `staleTime` default (D6). Optionally add `QueryCache.onError` for failed background
refetches (only when cached data exists).

5.9 **Lint/enforcement:** after migration forbid raw `queryKey: [...]` arrays and any use of the `QueryKey` enum outside
the factories (ESLint `no-restricted-syntax`/custom rule in `eslint-dats-rules.js`).

## 6. Decisions needed (my recommendation first)

| #   | Question                                                                                               | Recommendation                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | How do components get `projectId` once forwarding wrapper hooks go away?                               | **DECIDED:** components call `useAppSelector((state) => state.project.projectId)` directly (nothing wrong with it); a `useProjectId()` helper is optional sugar, added only if it gets repeated a lot. In routes, use the param via context. |
| D2  | Is the router work (stage 5) part of this effort?                                                      | **DECIDED: yes**, as its own stage after the factories; start with the search routes (real divergence).                                                                                                                                      |
| D3  | Brain keeps `setQueryData` for entity events?                                                          | **DECIDED: keep direct writes** (5.5).                                                                                                                                                                                                       |
| D4  | Add `mutationKey` everywhere? `isMutating` rule where?                                                 | **DECIDED: yes**, `mutationKey` on every mutation; the `isMutating` rule only for the optimistic annotation/search-view mutations.                                                                                                           |
| D5  | Add frontend tests (vitest, needs a new dev dependency) for "invalidate prefix matches the real keys"? | **DECIDED: no frontend tests for now.** Rely on `tsc` + typed keys + manual smoke tests per domain.                                                                                                                                          |
| D6  | Global `staleTime` default value?                                                                      | **DECIDED: keep the current default** (not important enough). Existing per-query `staleTime`s stay as they are.                                                                                                                              |

## 7. Stages

Each stage = own commit(s), `tsc --noEmit` + eslint + prettier clean, app smoke-tested for the touched domains.

### Stage 0: Decide and reset (no code risk)

- Agree on section 5 and answers to section 6; update this file.
- Decide the fate of the phase-1 prototype: keep the factory/typing parts, redo the file layout per rules (stage 2).
- Done when: rules are signed off.

### Stage 1: Foundations

- **Outcome: no code needed.** Global `staleTime` stays (D6). `QueryCache.onError` is deferred: it would add new user-visible
  toasts for background refetch failures, which nobody asked for. `useProjectId()` is not added (D1: components use
  `useAppSelector((state) => state.project.projectId)` inline, as 33 places already do). `TaggedKey` + typed `cacheWriterUtils`
  overloads already exist from the prototype. No test tooling (D5).
- Verification for all stages: `just typecheck frontend`, `just lint frontend`, `just format frontend` + manual smoke tests.

### Stage 2: Pilot domains per final rules: codes, tags, memos

- One layout per domain: `codeQueries.ts` (pure definitions) + the existing `CodeHooks.ts` (mutations with `mutationKey`s and hooks that derive data, e.g. `useGetCode` select). The Hooks files are **kept**; only the thin forwarding wrappers inside them are deleted. Same for tags and memos.
- Remove duplicate `enabled`; add `mutationKey`s; drop explicit generics.
- Update all call sites (`CodeHooks.useX` -> direct `useQuery(factory)` / mutation hook).
- **Also in this stage:** rewrite `.github/instructions/frontend.instructions.md` (it currently says "never call services
  directly, wrap in hooks", "centralize keys in the QueryKey.ts enum", workflow "1. QueryKey.ts, 2. Hooks", and has stale
  paths). Agents and Copilot follow it, so it must describe the new convention once the pattern is proven.
- Done when: the pattern is proven end to end for three domains and reviewed by you.

### Stage 3: Entity domains

Sweep, domain by domain, in this order (cache-sync dependencies first):

1. users/projects/api keys (`ME`, `PROJECT_USERS`, `USER_PROJECTS`, `USER_API_KEYS`), folders, sdoc (`SDOC*`), sdoc/project metadata.
2. annotations: span, bbox, sentence under one `["annotations", ...]` root (collapses the 11-line invalidation block on code delete); apply the optimistic-update `isMutating` rule (5.6).
3. whiteboards, timeline analysis, COTA, classifiers, perspectives/aspects, ML jobs.
4. jobs (import, crawler, LLM, classifier, duplicate finder, export, tag recommendation).

- Each domain: `<domain>Queries.ts` factory, the existing `<Domain>Hooks.ts` keeps its mutations (now with `mutationKey`s) and data-deriving hooks, brain/utils switched to tagged keys, direct cache writes in components moved into the brain.
- Done when: each domain has no `QueryKey.` references.
- **Result (done):** new factories `userQueries`, `projectQueries`, `apiKeyQueries`, `sdocQueries`, `folderQueries`, `metadataQueries`,
  `annotationQueries` (span / bbox / sentence under one root), `whiteboardQueries`, `timelineAnalysisQueries`, `cotaQueries`,
  `classifierQueries`, `perspectiveQueries`, `tagRecommendationQueries` and `jobQueries` (one shared shape for the 9 job types, which
  also types the brain's `upsertJob`). Every mutation in these domains has a `mutationKey`. Optimistic annotation updates roll back
  through one helper (`cache-sync/_utils/optimisticUtils.ts`) that follows the `isMutating === 1` rule. The code-delete handler
  invalidates `annotationQueries.all()` instead of eight keys.

### Stage 4: Derived, table and search keys

- Tables/search: `SEARCH_TABLE`, `SDOC_TABLE`, span/bbox/sentence/memo tables, `WORD_FREQUENCY_TABLE`, `IMG_SIMSEARCH`, `SENT_SIMSEARCH`, health tables, `TABLE_INFO` (`tableInfoQueryKey`), statistics, analysis keys, `DOCUMENT_VISUALIZATION`, `CLUSTER_*`, `ANNOSCALING_SUGGEST`, GitHub release, instance info, LLM keys.
- Replace `createSearchViewHooks` generic key argument (`SearchViewHooks.ts`) with a real factory (`searchViewQueries.byEntity(type, projectId)`), removing the `as unknown as` cast.
- Remove inline keys (`"sdocsWithDateMetadata"`, `"Existing-Annotation-Count"`).
- Done when: `QueryKey.ts` has no remaining uses.

### Stage 5: Router integration (fixes the Great Divergence)

- For each route with a loader (about 19): create the query options once in `context` from `params` + `loaderDeps`, loader only primes the cache, component reads `Route.useRouteContext()` (5.7). Replace `*ViewLoader.ts` files that rebuild options.
- Complete `loaderDeps` for every route whose queries depend on search params (only 5 of ~19 have them).
- Search routes first. Resolve `showFolders`: it is part of the query key but lives in Redux, so either move it into the URL search params or take it out of the key.
- Loaders that return data (whiteboard tab title): derive the title from the query (`select`) instead.
- Audit other search routes (sentence, image, health, word frequency) for the same loader/component mismatch.
- Done when: no component builds options its route loader also builds; every loader and component pair shares one options object.

### Stage 6: Queries + Mutations files side by side in `api/hooks/`

Requested by you. Goal: one folder, `api/hooks/`, holding for each domain a `<domain>Queries.ts` and a `<domain>Mutations.ts`,
named for what they are. No separate `api/queries/` folder and no per-domain folders.

- **Target layout:** `frontend/src/api/hooks/memoQueries.ts` + `frontend/src/api/hooks/memoMutations.ts` (same for every
  domain). `api/cache-sync/` stays as it is. The `api/queries/` folder is removed (its files move into `api/hooks/`).
- **`<Domain>Hooks.ts` goes away.** Its mutation hooks move to `<domain>Mutations.ts`. Call sites change from
  `MemoHooks.useCreateMemo()` to a named import (`useCreateMemo` from `@api/hooks/memoMutations`); a mechanical rewrite
  like the stage 2 script, verified by `tsc`.
- **Sub-decision (open, to settle before this stage):** the few hooks that derive data (`useGetCode`, `useGetEnabledCodes`,
  `useGetAllCodesList`, `useGetTag`) fit neither file name. Options: (a) inline the `select` at the call sites, as TkDodo
  recommends; (b) export the selector functions from `<domain>Queries.ts` (pure functions, no React) and call
  `useQuery({ ...codeQueries.byProject(id), select: selectEnabledCodes })`. My recommendation is (b).
- Update the import aliases, ESLint boundary/path rules, `frontend.instructions.md` and the cache-sync README (they
  currently mention `api/queries/`).
- Why it comes late: stages 3 and 4 keep creating new domains; moving everything once at the end avoids renaming files
  repeatedly. Until then, new `<domain>Queries.ts` files are created in `api/queries/` with their final file names, so stage 6
  only moves them and splits the Hooks files into `*Mutations.ts`.
- Done when: no `api/queries/` folder, no `*Hooks.ts` files, every domain has `<domain>Queries.ts` + `<domain>Mutations.ts` in `api/hooks/`.

### Stage 7: Cleanup and enforcement

- Delete `QueryKey.ts` and its governance comment; remove the loose untyped overloads in `cacheWriterUtils`.
- Add the lint rule (5.9); update `api/cache-sync/README.md` and write a short "Query conventions" section in the docs/AGENTS files.
- Done when: lint rule on, no enum, docs updated.

## 8. Related: hey-api client migration (separate branch, after this)

Order: **this plan first, hey-api second.** The factories decouple keys from the API client, so hey-api later only changes the
`queryFn` inside factories. Use hey-api for SDK and types only, **not** its TanStack Query plugin (its keys are shaped per
endpoint, not per domain, and would fight the hierarchy and the brain). It is still 0.x (breaking changes), and changes
service call shape (`{ path, query, body }`), the `{ data, error }` return default and the `ApiError`-based handling in
`queryClient.ts`.

## 9. Sources (TkDodo)

- Effective React Query Keys: https://tkdodo.eu/blog/effective-react-query-keys
- The Query Options API: https://tkdodo.eu/blog/the-query-options-api
- Creating Query Abstractions: https://tkdodo.eu/blog/creating-query-abstractions
- Mastering Mutations: https://tkdodo.eu/blog/mastering-mutations-in-react-query
- Concurrent Optimistic Updates: https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query
- Automatic Query Invalidation after Mutations: https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations
- Using WebSockets with React Query: https://tkdodo.eu/blog/using-web-sockets-with-react-query
- React Query Error Handling: https://tkdodo.eu/blog/react-query-error-handling
- Type-safe React Query / React Query and TypeScript: https://tkdodo.eu/blog/type-safe-react-query , https://tkdodo.eu/blog/react-query-and-type-script
- Data Transformations / Selectors Supercharged: https://tkdodo.eu/blog/react-query-data-transformations , https://tkdodo.eu/blog/react-query-selectors-supercharged
- Seeding the Query Cache: https://tkdodo.eu/blog/seeding-the-query-cache
- TanStack Router and Query: https://tkdodo.eu/blog/tan-stack-router-and-query
- Reliable Query Prefetching with TanStack Router: https://tkdodo.eu/blog/reliable-query-prefetching-with-tanstack-router
