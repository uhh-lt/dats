# Plan: Query keys, query definitions, mutations and route prefetching (frontend)

Status: **Stages 0-3 done and committed. Stage 4 next. Structure (D7) and the one loader rule (D8) decided, see sections 5, 6 and stages 5-6.**
Branch: `refactor/query-key-factories` (stages 2 and 3 are committed).
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

### Layers: who may import what (ESLint `boundaries`, `eslint.config.mjs`)

```
routes -> features -> core -> api -> models / hooks / store / utils
```

- `features` may import `api`, `core`, `components`, `hooks`, `models`, `store`, `utils`, but **not other features**.
- `core` may import `api`, other `core` domains, ... but **not `features`**.
- `api` may import `models`, `hooks`, `store`, `utils`, but **not `core` or `features`**. `components` may not import `api`.
- `no-internal-modules-public-entry`: other code imports a core/feature domain only through its `index.ts`.
- `no-cross-slice-access`: code may only read the Redux slices of its own domain (and global slices such as `project`).

So where a file lives decides who can use it. On `main`: 26 files in `api/hooks` (older entity domains) and 16 files in
`features/*/_api` (classifier, COTA, perspectives, timeline, whiteboard, ML, search, health, ...). The brain imported only the
global `QueryKey` enum, `queryClient` and models, never a query or hook file: the enum was the only shared contract, and both
sides retyped the key and assumed the same data shape. The typed factories replace that, which is why the brain now has to import
the factories (and why they cannot stay private to a feature).

### Who uses each domain today (measured)

| Used by                                       | Domains                                                                                                                                        | Target (stage 6)                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| core **and** several features                 | code, tag, memo, folder, project, sdoc, user, project metadata + sdoc metadata, span / bbox / sentence annotations                             | `core/<domain>/api`                             |
| exactly one feature                           | classifier, COTA, ML jobs, perspectives, timeline, whiteboard, tag recommendations, API keys, annotation scaling, import                       | `features/<feature>/_api`                       |
| several features, **no matching core domain** | LLM (4 features), statistics (2), document processing (2), general / instance info (auth + plugins), job queries shared by core/export-buttons | needs a home, see open sub-decisions in stage 6 |

### Phase-1 prototype (historical, now committed)

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

5.1 **One query factory per domain, no React in it, living in the domain.** Each domain has `<domain>Queries.ts` (what we fetch:
pure key + queryFn, usable anywhere, also outside React) and `<domain>Mutations.ts` (React usage: the domain's mutation hooks
and, if needed, hooks that derive data). Keys: domain, scope, params. **Where the files live (decided, D7, target layout of stage 6):**

- a domain that **core and several features** use -> `core/<domain>/api/`, e.g. `core/code/api/codeQueries.ts` + `codeMutations.ts`;
- a domain that **only one feature** uses -> `features/<feature>/_api/`, e.g. `features/classifier/_api/classifierQueries.ts`;
- `api/` keeps only the services, `queryClient` and the cache-sync code (the "brain").

The location decides who may import it (see the layer rules in section 4): a file in `features/x/_api` cannot be used by any
other feature or by `core`. The brain is the only exception (see 5.9), and it may import only the pure `*Queries.ts` files.
_Until stage 6 the existing files are still in `api/queries/` and `api/hooks/` (interim state)._
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

5.6 **Mutations:** in the domain's `<domain>Mutations.ts` (stage 6; until then in `<Domain>Hooks.ts`). A mutation hook may only
read global Redux slices (`project`, `websocket`); state of a feature slice must be passed in as a parameter or the hook stays in
that feature (ESLint `no-cross-slice-access`). Every mutation has a `mutationKey` starting with the domain, e.g. `["tags", "create"]`.
Cache reactions go through the brain via `meta.datsEvent`; no cache code in components. `mutate` by default,
`mutateAsync` only for dependent/concurrent mutations. Necessary logic in `useMutation` callbacks, UI actions in
`mutate` callbacks. Optimistic updates: `cancelQueries` in `onMutate`, rollback in `onError`, invalidate in `onSettled`
only when `isMutating({ mutationKey }) === 1`.

5.7 **Routes: ONE rule for all 19 routes with a loader (decided, D8; to be tested in a pilot first, see stage 5).**
What a loader is for: a query factory only _describes_ a query; a loader _starts_ it when the user navigates (or hovers the link,
`defaultPreload: "intent"`), before the view renders. It is a speed-up, not needed for correctness.

1. **`context`** builds the route's query options once, from `params` + `loaderDeps` (search params that affect a query).
2. **`loader`** does `await queryClient.ensureQueryData(...)` on exactly those options and returns nothing. It always awaits (every
   route already has a `pendingComponent`, and the tab title needs the data).
3. **The view** uses `useSuspenseQuery(<the same options from Route.useRouteContext()>)`. It never builds options itself and never
   uses `useLoaderData`.
4. **Tab title:** `getTitle` no longer receives loader data; it reads the already-loaded entity from the query cache (the loader
   filled it).
5. **Cache hydration** (the whiteboard bundle that seeds many caches) becomes part of the query itself (TkDodo's "Seeding the Query
   Cache": the `queryFn` calls `setQueryData` for the other caches), not a special loader.

Any state that affects a query's key must be route state (params/search), not Redux. No `*ViewLoader.ts` files remain.

5.8 **Defaults:** keep the current `staleTime` default (D6). Optionally add `QueryCache.onError` for failed background
refetches (only when cached data exists).

5.9 **Lint/enforcement:** after migration forbid raw `queryKey: [...]` arrays and any use of the `QueryKey` enum outside
the factories (ESLint `no-restricted-syntax`/custom rule in `eslint-dats-rules.js`).
**The brain exemption (D7), with guard rails:** `api/cache-sync/**` may import the query factories from `core/*/api` and
`features/*/_api` by deep path. Only files named `*Queries.ts` (exempt from `boundaries/element-types` and from the
public-entry rule for the brain only), and those files must stay pure: they import only services, models and TanStack Query, never
React, Redux, `queryClient` or components. That keeps the brain's import graph free of cycles. A lint check also forbids two
factories with the same root key (the key list is no longer in one folder).

## 6. Decisions needed (my recommendation first)

| #   | Question                                                                                               | Recommendation                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | How do components get `projectId` once forwarding wrapper hooks go away?                               | **DECIDED:** components call `useAppSelector((state) => state.project.projectId)` directly (nothing wrong with it); a `useProjectId()` helper is optional sugar, added only if it gets repeated a lot. In routes, use the param via context. |
| D2  | Is the router work (stage 5) part of this effort?                                                      | **DECIDED: yes**, as its own stage after the factories; start with the search routes (real divergence).                                                                                                                                      |
| D3  | Brain keeps `setQueryData` for entity events?                                                          | **DECIDED: keep direct writes** (5.5).                                                                                                                                                                                                       |
| D4  | Add `mutationKey` everywhere? `isMutating` rule where?                                                 | **DECIDED: yes**, `mutationKey` on every mutation; the `isMutating` rule only for the optimistic annotation/search-view mutations.                                                                                                           |
| D5  | Add frontend tests (vitest, needs a new dev dependency) for "invalidate prefix matches the real keys"? | **DECIDED: no frontend tests for now.** Rely on `tsc` + typed keys + manual smoke tests per domain.                                                                                                                                          |
| D6  | Global `staleTime` default value?                                                                      | **DECIDED: keep the current default** (not important enough). Existing per-query `staleTime`s stay as they are.                                                                                                                              |
| D7  | Where do the query / mutation files live?                                                              | **DECIDED: in their domain.** Shared by core + several features -> `core/<domain>/api`; one feature only -> `features/<feature>/_api`. The brain may import `*Queries.ts` from everywhere (narrow exemption, 5.9). Not one global folder.    |
| D8  | How do loaders work?                                                                                   | **DECIDED: one rule for all 19 routes** (5.7): context builds options, loader awaits `ensureQueryData` and returns nothing, view uses the same options, tab title read from the cache. **Pilot it on 2 routes first, then roll out.**        |

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
- **Consistency fix after stage 3:** the hooks and mutations of whiteboards, timeline analyses, COTA, classifiers, perspectives and ML jobs
  used to stay in feature-local `_api/*QueryOptions.ts` files while their queries were in `api/queries/`. They now live in `api/hooks/`
  (`WhiteboardHooks.ts`, `TimelineAnalysisHooks.ts`, `CotaHooks.ts`, `ClassifierHooks.ts`, `PerspectivesHooks.ts`, `MlJobHooks.ts`), like
  `CodeHooks.ts` and `TagHooks.ts`. The reason queries have to be global: the cache-sync code (`api/`) may not import from `features/`.
  `useLabelDocs`/`useUnlabelDocs` stay in the perspectives feature because they read the `perspectives` Redux slice, which `api/hooks` may not do.

### Stage 4: Derived, table and search keys

- Tables/search: `SEARCH_TABLE`, `SDOC_TABLE`, span/bbox/sentence/memo tables, `WORD_FREQUENCY_TABLE`, `IMG_SIMSEARCH`, `SENT_SIMSEARCH`, health tables, `TABLE_INFO` (`tableInfoQueryKey`), statistics, analysis keys, `DOCUMENT_VISUALIZATION`, `CLUSTER_*`, `ANNOSCALING_SUGGEST`, GitHub release, instance info, LLM keys.
- Replace `createSearchViewHooks` generic key argument (`SearchViewHooks.ts`) with a real factory (`searchViewQueries.byEntity(type, projectId)`), removing the `as unknown as` cast.
- Remove inline keys (`"sdocsWithDateMetadata"`, `"Existing-Annotation-Count"`).
- New query files are created in `api/queries/` for now (interim, same as stages 2-3) and moved with all the others in stage 6.
- Done when: `QueryKey.ts` has no remaining uses.

### Stage 5: Loaders: one rule for all 19 routes (fixes the Great Divergence)

**What the investigation found:** 19 `*ViewLoader.ts` files (408 lines), no route uses `context`, only 6 declare `loaderDeps`.
16 loaders `await`, 3 do not (the COTA / timeline / whiteboard dashboards). 6 return an entity (annotation, COTA, timeline,
perspectives dashboard and map, whiteboard) and the only reason is the **tab title**: `TabSynchronizer` passes `loaderData` to
each route's `getTitle`. 6 loaders (document / image / sentence search, health, word frequency, ...) rebuild their query options
from search params, and the view builds them again (the live `showFolders` mismatch). One loader (whiteboard) also hydrates many
caches. All routes already have a `pendingComponent`. The views already use `useSuspenseQuery`, so TkDodo's "always call a
query hook" holds; `queryClient` in router context and `defaultPreloadStaleTime: 0` are in place.

**The rule (5.7):** context builds the options once; the loader awaits `ensureQueryData` on them and returns nothing; the view
uses the same options; the tab title reads the entity from the cache; cache hydration moves into the query's `queryFn`.

**Pilot first (decided):**

1. Pick two routes: one that depends only on params (the classifier route) and one that depends on search params and has a tab
   title (document search, the route with the live mismatch). Apply the rule, including the tab title from the cache.
2. Check by hand: navigation by click and by hover, back/forward, reload, a tab title appears, `showFolders = false` no longer
   double-fetches, devtools show one request per query.
3. Review together. If the rule holds, roll it out to the other 17 routes; if not, adjust the rule first.

- Resolve `showFolders` (part of the query key but in Redux): either move it into the URL search params or take it out of the key.
- Done when: no `*ViewLoader.ts` files remain, every route follows the rule, and no view builds options its loader also builds.

### Stage 6: Domain folders (D7)

Requested by you: each domain's `<domain>Queries.ts` and `<domain>Mutations.ts` side by side, in the domain they belong to.

- **Layout:** see 5.1 and the table in section 4. Shared domain -> `core/<domain>/api/`, single-feature domain -> `features/<feature>/_api/`.
  `api/queries/` and `api/hooks/*Hooks.ts` disappear; `api/` keeps services, `queryClient` and cache-sync.
- **Lint config (first step, before moving files):** the narrow brain exemption from 5.9 (deep import of `*Queries.ts` only), a check
  for duplicate root keys, and updated alias rules. Verify with one shared domain (codes -> `core/code/api`) and one private domain
  (COTA -> `features/concept-over-time-analysis/_api`) before moving the rest.
- **Mutations:** `<Domain>Hooks.ts` files become `<domain>Mutations.ts`; call sites change from `MemoHooks.useCreateMemo()` to a
  named import. Mechanical rewrite with a script, verified by `tsc` and lint, like stages 2-3.
- **Consequences to accept:** the brain depends on every domain it caches (removing a feature means touching the brain); the key list
  is spread over ~25 folders; hooks that read a feature slice stay in that feature (`useLabelDocs`, `useGetDocVisualization`,
  `useDatasetStatistics`).
- **Open sub-decisions (settle before moving):**
  1. `metadataQueries` -> split into `core/project-metadata/api` and `core/sdoc-metadata/api`.
  2. `annotationQueries` has one shared root used to invalidate all annotations (code delete). Split into the three core annotation
     domains, with the shared root in `core/annotation/api`.
  3. `jobQueries` (9 job types, one shape): per-type definitions live with their feature (ML, classifier, COTA refinement,
     perspectives, import, LLM, crawler, duplicate finder), the shared shape / `upsertJob` helper in `core/job/api`.
  4. Domains used by several features without a core domain: LLM, statistics, document processing, general / instance info -> new
     core domains (`core/llm`, `core/statistics`, ...) or the closest existing one.
  5. Hooks that derive data (`useGetCode`, `useGetTag`, ...): export the selector as a pure function from `<domain>Queries.ts`
     and use `useQuery({ ...codeQueries.byProject(id), select: selectEnabledCodes })` (recommended), or inline the `select`.
- Update `frontend.instructions.md` and the cache-sync README (they mention `api/queries/` and `api/hooks/`).
- Done when: no `api/queries/` folder, no `*Hooks.ts` files, every domain has `<domain>Queries.ts` + `<domain>Mutations.ts` in its domain folder.

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
