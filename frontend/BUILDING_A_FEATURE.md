# Building a Feature with TanStack Router + TanStack Query

This document describes the recommended frontend pattern for new feature pages in this codebase.

It is based on the migrated Whiteboard feature and should be used for all route-backed feature pages (especially pages that open as tabs).

Note:

- Some frontend ESLint architecture boundary checks are currently stricter than intended (for example: routes cannot import from utils).
- These specific boundary-violation lint findings can currently be ignored while migrating features.

## Goals

- Keep route definitions thin and declarative.
- Keep server-state fetching in feature-local query options.
- Use route loaders for prefetching and tab title data.
- Use suspense-based rendering inside route-backed views.
- Keep feature-specific cache pre-warming in the feature loader only.

## Folder Pattern

Inside each feature, prefer this structure:

- `_api/<feature>QueryOptions.ts`: query options + mutations + optional convenience hooks.
- `views/<view>/...View.tsx`: route-backed view component (detail and dashboard follow the same pattern).
- `views/<view>/<feature>ViewLoader.ts`: route loader used by TanStack Router.
- `views/<view>/_hooks/<feature>RouteAPI.ts`: typed route API via `getRouteApi(...)` (optional when used in only one file).
- `index.ts`: re-export view and loader used by route files.

## 1. Define Query Options in Feature `_api`

Create a query options factory that fetches a project-level list and normalizes to a map:

```ts
export const projectEntitiesQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_ENTITIES, projectId],
    queryFn: async () => {
      const data = await EntityService.getByProject({ projectId });
      return data.reduce((acc, entity) => {
        acc[entity.id] = entity;
        return acc;
      }, {} as EntityMap);
    },
    staleTime: 1000 * 60 * 5,
  });
```

Why map format?

- O(1) lookup for route ID selection.
- Easy cache updates after create/update/delete mutations.

## 2. Add a Feature View Loader

The loader should prefetch route data before the view renders:

```ts
export async function entityViewLoader({ queryClient, projectId, entityId }: Args) {
  const map = await queryClient.ensureQueryData(projectEntitiesQueryOptions(projectId));
  return map[entityId];
}
```

This gives route-level pending/error handling and provides loader data for tab title inference.

For dashboard/list routes, use the same pattern:

```ts
export async function entityDashboardViewLoader({ queryClient, projectId }: DashboardArgs) {
  await queryClient.ensureQueryData(projectEntitiesQueryOptions(projectId));
}
```

Guideline:

- Always use `context.queryClient` from the route loader arguments.
- Prefer `await queryClient.ensureQueryData(...)` in loaders for explicit prefetch sequencing.
- Loaders should prefetch only data that is fetched in the corresponding `...View.tsx` (view-owned server state).
- Do not prefetch data that is only fetched in deeply nested child components by default.
- Query options used in a loader must also be used in the corresponding route-backed view (for example via `useSuspenseQuery`).
- Avoid defining loader-only query options. Reuse the same query options object/factory in both places.

Nested data rule:

- If you want nested data to be route-prefetched, first lift that query state into the route view component.
- After lifting, add that query option to the view loader.
- Keep route loaders focused on main-view content, not opportunistic prefetch for unrelated nested widgets.

## 3. Keep Feature-Specific Cache Priming in Loader

Some features need extra caches pre-populated.

Whiteboard is the reference example:

- It loads whiteboard-specific data from `WhiteboardService.getDataById(...)`.
- It writes related entities (`sdoc`, `memo`, annotations, codes, tags) into query cache via `queryClient.setQueryData(...)`.

Rule:

- If a feature has special denormalized payloads, do all cache priming in that feature's loader.
- Do not leak this logic into generic query options.

## 4. Use Suspense Query in the Route-Backed View

Inside the view, read params from `getRouteApi(...)` and use `useSuspenseQuery(...)` with `select`:

```ts
const { projectId, entityId } = FeatureRouteAPI.useParams();

const { data: entity } = useSuspenseQuery({
  ...projectEntitiesQueryOptions(projectId),
  select: (data) => data[entityId],
});
```

Notes:

- Do not duplicate loading/error branches in the view if route pending/error components are configured.
- Keep view focused on UI composition only.
- Prefer owning primary route data-fetching in the view and pass data down to nested components as props.
- Route-backed views should consume server data with `useSuspenseQuery(...)` and shared query options, not with feature-local `useQuery(...)` wrappers.

## 5. Wire the Route File

In the route file (`createFileRoute(...)`):

- Parse numeric params.
- Call the feature loader.
- Provide `pendingComponent` and `errorComponent`.
- Use `staticData.getTitle` to derive tab title from loaded entity.

Notes:

- Detail routes usually use dynamic titles from loader data.
- Dashboard/index routes usually use static titles and still use loaders for prefetch.

Example shape:

```ts
staticData: {
  tab: true,
  icon: Icon.X,
  getTitle: (entity: Awaited<ReturnType<typeof entityViewLoader>> | undefined) =>
    `Entity ${String(entity?.name ?? "")}`,
},
loader: ({ context, params }) =>
  entityViewLoader({
    queryClient: context.queryClient,
    projectId: params.projectId,
    entityId: params.entityId,
  }),
pendingComponent: () => <CircularProgress />,
errorComponent: ({ error }) => <div>Failed to load entity: {(error as Error).message}</div>,
```

## 6. Move Suitable View State to URL Search State

For route-backed views, prefer URL search state over local `useState` when the state should be shareable, restorable, or tab-persistent.

Use URL search state for:

- User-selected filters (for example user ids, doc types, selected folder ids).
- View controls that define the visible result set (sorting, thresholds, fetch size, query text).
- Entity selections that should survive refresh/navigation (for example selected item ids).

Keep local/component state for:

- Ephemeral UI-only state (popover open, hover state, transient animation toggles).
- Internal recursion state that is not meaningful outside the component.

Route side:

- Define `validateSearch` with a zod schema.
- Add safe defaults (`.default(...)`) for list/primitive values.
- Use `.optional()` for nullable selections.

```ts
const featureSearchSchema = z.object({
  selectedId: z.coerce.number().optional(),
  selectedUserIds: z.array(z.coerce.number()).default([]),
  selectedDocTypes: z.array(z.nativeEnum(DocType)).default([]),
});

export const Route = createFileRoute("...")({
  validateSearch: zodValidator(featureSearchSchema),
  component: FeatureView,
});
```

View side:

- If state is read-only in that component, use `const { value } = RouteAPI.useSearch()`.
- If state must be both read and written, use `useURLConnector(RouteAPI, "searchKey")`.
- For text inputs (for example search query fields), use `useURLConnectorDebounced(...)` to avoid excessive URL updates while typing.
- Replace matching local `useState` where persistence/shareability is desired.

```ts
const [selectedUserIds, setSelectedUserIds] = useURLConnector(FeatureRouteAPI, "selectedUserIds");
const [selectedDocTypes, setSelectedDocTypes] = useURLConnector(FeatureRouteAPI, "selectedDocTypes");

const { selectedCode } = FeatureRouteAPI.useSearch();

const [searchQuery, setSearchQuery] = useURLConnectorDebounced(FeatureRouteAPI, "searchQuery", 400);
```

Implementation behavior requirement:

- During feature migration, always review local state and explicitly classify each state field as URL state vs local state.
- If any field is suitable for URL state, ask the user whether they want that field migrated to URL state before finalizing the implementation.
- When state is moved from Redux/local state to URL search state, explicitly re-evaluate the feature slice and remove no-longer-needed feature-specific state/reducers.
- Do not modify shared generic reducers/slices (for example `filterReducer`, `tableReducer`) during this cleanup; apply changes only in the feature slice being migrated.
- Preserve behavior parity during migration: before removing old reducers/actions, identify their user-visible side effects and re-implement those effects in the migrated architecture (URL state, view effects, loader, or feature slice actions).
- Never delete functionality without a mapped replacement. If behavior cannot be migrated safely in the same change, stop and ask for guidance instead of silently dropping it.

## 7. Keep Existing Hook API Stable During Migration

If legacy code still imports from old API hook modules:

- First, check whether any files outside the feature still import the legacy hook file.
- If no external consumers exist (only the feature itself or no consumers), remove the legacy hook file.
- If external consumers still depend on it, keep a temporary facade and rewire it to feature `_api` hooks/query options.
- In that case, notify the user explicitly that the legacy file cannot yet be removed and ask them how they want to proceed.

This allows incremental migration without breaking existing components.

After all consumers are migrated:

- Remove the legacy facade files.
- Update comments/references (for example `QueryKey` ownership comments) to point to feature-local modules.

## 8. Migration Checklist

Use this checklist when migrating a detail page route:

1. Add feature query options in `_api`.
2. Add feature view loader (`ensureQueryData` + map lookup).
3. Add route API hook file with `getRouteApi(...)` if route access is shared across files.
4. Refactor view to `useSuspenseQuery` + `select`.
5. Update route file to use loader, pending/error, dynamic tab title.
6. Export loader from feature `index.ts`.
7. Repeat the same loader+suspense pattern for dashboard/index route.
8. Keep/rewire legacy hook facades when needed.
9. Remove legacy facades once no imports remain.
10. Review local state for URL suitability and migrate confirmed candidates to `validateSearch` + `useURLConnector`.
11. Verify that each query options factory introduced for the route-backed feature is consumed in at least two places: the feature loader and the corresponding view.

## 9. Import Boundaries

Respect feature privacy boundaries:

- Treat `features/<feature>/_api` as feature-internal.
- Route files should import loaders/components from the feature public API (`@features/<feature>`), not from `_api` directly.
- Re-export route-used loaders from feature `index.ts`.

## Whiteboard-Specific Reference

Whiteboard demonstrates the full pattern plus advanced pre-warming:

- Query options: `projectWhiteboardsQueryOptions(...)`
- Loader: `whiteboardViewLoader(...)`
- Route: `whiteboard/$whiteboardId.tsx` using loader + dynamic title
- View: `WhiteboardView.tsx` using `useSuspenseQuery(...)`
- Special behavior: whiteboard loader primes related caches for child nodes

This is the canonical pattern for route-driven, tab-aware feature pages in this repository.
