---
applyTo: "frontend/src/**/api/*Queries.ts, frontend/src/**/api/*Hooks.ts"
paths:
  - "frontend/src/**/api/*Queries.ts"
  - "frontend/src/**/api/*Hooks.ts"
---

# Frontend API Pattern (Query Factories and Hooks Objects)

All server state goes through Tanstack Query. Every domain defines its queries once, in a query factory (`<domain>Queries.ts`), and its mutations and value-adding query hooks in a hooks object (`<domain>Hooks.ts`). Routes, components, the websocket cache-sync code and the optimistic updates all build on the same keys, so the keys must be predictable: invalidation is prefix-based, and a key written twice drifts apart. Where a query is started (route loader or component) is decided by the route rules (`frontend-route.instructions.md`); the factory is the same in both cases.

## File Structure

```ts
// <domain>/api/<domain>Queries.ts — plain object, no React
import { TagService } from "@api/services/TagService";
import { queryOptions, skipToken } from "@tanstack/react-query";

// 1. Optional: exported map / request types of the leaves (`export type TagMap = Record<number, TagRead>`)

/**
 * 2. Doc comment: what the factory loads and one line per leaf with its key.
 *
 *   tagQueries.all()                ["tag"]
 *   tagQueries.byProject(projectId) ["tag", "project", projectId]
 */
export const tagQueries = {
  // 3. The domain root; the file is named after it (lint)
  all: () => ["tag"] as const,

  // 4. Per leaf: a short comment, its scope, then the leaf
  byProjectScope: () => [...tagQueries.all(), "project"] as const,
  byProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: [...tagQueries.byProjectScope(), projectId] as const,
      queryFn: projectId === undefined ? skipToken : () => TagService.getByProject({ projectId }),
      staleTime: 1000 * 60 * 5,
    }),

  // 5. Optional: tableInfo, search/searchScope, optimisticMutationScope, job (see Rules)
};
```

```ts
// <domain>/api/<domain>Hooks.ts
// 1. Imports: services, models, useAppSelector, useMutation/useQuery, the own factory (relative)
// 2. Query hooks (only those that add something), then mutation hooks: `const useX = (...) => ...`
const useGetTag = (tagId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...tagQueries.byProject(projectId),
    select: (data) => data.find((t) => t.id === tagId)!,
    enabled: !!tagId,
  });
};

const useCreateTag = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "createTag"],
    mutationFn: TagService.createDocTag,
    meta: { datsEvent: "TAG_CREATED", successMessage: (tag: TagRead) => `Created tag ${tag.name}` },
  });

// 3. The hooks object, named after the file (lint): tagHooks.ts -> TagHooks
export const TagHooks = { useGetTag, useCreateTag };
```

## Rules

### Location and Files

- **Owner**: queries live in the domain that owns the data, in a public `api/` folder: `core/<domain>/api/` when core or several features use it, `features/<feature>/api/` when exactly one feature uses it, `api/<name>/` (global) when several features use it and none owns it (`general`, `statistics`).
- **Two files**: `<domain>Queries.ts` (factory) and `<domain>Hooks.ts` (`<Domain>Hooks`). A folder without value-adding hooks or mutations has only the queries file; there are no empty hooks objects. A folder without queries has only the hooks file, which defines its mutation-key root itself (`const authKey = ["auth"] as const`, see `authHooks.ts`, `documentSamplerHooks.ts`).
- **Naming** (lint): the factory `xQueries` lives in `xQueries.ts` and its root is `all: () => ["x"]`; the hooks object of `xHooks.ts` is `XHooks`. Do not create a second factory for an existing root.
- **Exports**: the domain's `index.ts` exports its `api/` files; outside the domain import `{ TagHooks, tagQueries } from "@core/tag"`, inside use relative imports. Only `api/cache-sync` may import `.../api/<file>` deeply (ESLint exemption).
- **Feature slices**: a hook that reads a feature's Redux slice belongs to that feature's hooks object (`PerspectivesHooks.useLabelDocs`); `core` never reads feature slices.

### Query Factories

- **Shape**: a plain object of `all()`, key prefixes (`...Scope`) and leaves (`queryOptions` / `infiniteQueryOptions`). No React, no hooks.
- **Keys**: hierarchical, domain → scope segment → params: `["tag", "project", projectId]`. Every key is `as const`.
- **Scopes** (lint): every leaf with params has a prefix `<leaf>Scope()` (`[...xQueries.all(), "<segment>"]`) and its key starts with it. A parameterized prefix for invalidation is named `<leaf>Of<Param>Scope(param)` (`spanAnnotationQueries.bySdocOfSdocScope(sdocId)`, `sdocQueries.searchOfProjectScope(projectId)`). A leaf without params uses `[...xQueries.all(), "<segment>"]`. Every other key function ends with `Scope`.
- **Leaf names**: `byId(id)` for one entity (segment `"detail"`), `byProject(projectId)` for all entities of a project, `by<Param>` / `<data>By<Param>` for other lookups (`bySdoc`, `idsBySdoc`, `aspectsByProject`). Keep names consistent with these, not with the service method.
- **Leaf params**: identity params only (ids, filters, the backend request). Never `enabled`, `select` or `staleTime` params. A leaf may set `staleTime`, `retry`, `refetchOnWindowFocus` itself when they belong to the data.
- **Missing ids**: a leaf whose id may be missing takes `number | null | undefined` and returns `skipToken` as `queryFn`. A leaf used by a route loader or `useSuspenseQuery` takes a strict id (`projectId: number`) with a normal `queryFn`; non-route call sites add `enabled` (in a hook).
- **queryFn**: inline. A module-level helper only when several leaves share it (`nextPageByCount` in `memoQueries.ts`). Type the service call, never use generics like `queryOptions<T>`. Data reshaping that every consumer needs (array → `Record<id, T>` map for O(1) access) happens in the `queryFn`; say so in the leaf comment.
- **Seeding**: a leaf whose response contains other entities may seed their caches in its `queryFn` via the typed keys (`sdocQueries.search`, `whiteboardQueries.data`), never a route or component.
- **Search listings**: filtered, sorted, paginated listings are `search(request)` + `searchScope()` (variant `searchGrouped`), with `tableInfo(projectId)` for the column infos of the filter table (key from `tableInfoQueries.byDomain(...)`, `staleTime: Infinity`). The leaf takes the backend request without the page (`Omit<Parameters<typeof Service.method>[0], "page">` or the request DTO) and adds the page in the `queryFn`; callers convert UI sorting with `toSorts<Column>(sortingModel)`. No `table` leaf, no UI translation in the leaf.
- **Jobs**: background jobs are the `job` property, `createJobQueries("<root>", fetchJob, fetchJobs?)` from `@core/job` (`job.byId(jobId)`, `job.byProject(projectId)`). Components follow a job with `useLiveJob(xQueries.job.byId(jobId))`.
- **Optimistic scope**: a domain with optimistic mutations has `optimisticMutationScope: () => [...xQueries.all(), "optimistic"]`.

### Hooks Objects: Query Hooks

- **Value**: a query hook exists only if it adds something: `select`, `enabled`, the project id from Redux, polling, `placeholderData`, composition of several queries (`useQueries`), or a Redux-derived request. Otherwise components call `useQuery(xQueries.leaf(...))` directly.
- **No forwarding** (lint): a hook that only passes its arguments to a leaf (also `select` / `enabled` passed through unchanged) is forbidden.
- **No aliases**: a hook that only calls another hook of the object with preset arguments and no own selection is forbidden; give the real hook optional parameters (`TagHooks.useGetAllTags({ select, enabled })`).
- **Build on the factory**: `useQuery({ ...xQueries.leaf(...), select, enabled })`. A hook never writes a `queryKey` or `queryFn`.
- **Names**: `useGet<Entity>(id)` (one entity, usually selected from the project list/map), `useGetAll<Entities>(options?)` (list), `useGetAll<Entities>Map(options)` (map with `select`/`enabled`), `useGet<Data>(...)` otherwise, `usePoll<Data>` for polling. Private base hooks that no component uses stay out of the object.
- **No dead hooks**: the object contains only hooks that are used outside the file.

### Hooks Objects: Mutations

- **Key** (lint): `mutationKey: [...xQueries.all(), "<hookName without use>"]` (`useCreateTag` → `"createTag"`). Optimistic mutations start with `...xQueries.optimisticMutationScope()`, job starts are `[...xQueries.job.all(), "start"]`. Every `useMutation` has a `mutationKey` (lint).
- **Names**: `use<Verb><Entity>` (`useCreateCode`, `useDeleteBulkSpanAnnotation`, `useStartClassifierJob`).
- **mutationFn**: pass the service method directly when its argument fits (`mutationFn: TagService.createDocTag`); otherwise a single arrow that maps the variables. No `async`/`await` wrapper.
- **Cache updates**: tag the mutation with `meta.datsEvent`; the cache-sync code (`api/cache-sync`) writes the result into all caches. `meta.successMessage` / `meta.errorMessage` show the notification. A hook writes or invalidates a cache itself only for data without a DATS event (user-private data, results of this user's request) and says why in a comment (`MemoHooks.useRecordRecentMemo`, `PerspectivesHooks.useLabelDocs`).
- **Optimistic updates**: `onMutate` cancels and snapshots the affected typed key, `onError` calls `rollbackOptimisticUpdate(queryClient, key, previous, xQueries.optimisticMutationScope())` from `@utils/optimisticUtils`.
- **Callbacks**: logic that always belongs to the mutation goes in `useMutation`; caller-specific UI reactions go in the `mutate(variables, { onSuccess })` call. Callers use `mutate`; `mutateAsync` only when the result must be awaited in sequence (`useMemoPersistence` save queue). When the caller must decide what happens with the result, the hook takes `onSuccess`/`onError` as options (`AuthHooks.useLogin`).

### Cache Access

- `setQueryData` / `getQueryData` / `invalidateQueries` use the typed key `xQueries.leaf(...).queryKey` or a scope prefix (`xQueries.searchScope()`), never a hand-written array (lint: no `queryKey` array literal outside `*Queries.ts`).

## Examples

See:

- [tagQueries.ts](../../frontend/src/core/tag/api/tagQueries.ts) / [tagHooks.ts](../../frontend/src/core/tag/api/tagHooks.ts) — scopes, `skipToken`, select hooks with options, mutations with `datsEvent`.
- [memoQueries.ts](../../frontend/src/core/memo/api/memoQueries.ts) — `search` / `searchGrouped` / `tableInfo` leaves taking the backend request.
- [spanAnnotationHooks.ts](../../frontend/src/core/span-annotation/api/spanAnnotationHooks.ts) — optimistic mutations with rollback.
- [classifierQueries.ts](../../frontend/src/features/classifier/api/classifierQueries.ts) — strict ids for route loaders, map reshaping, `createJobQueries`.
