---
applyTo: "frontend/src/routes/**"
paths:
  - "frontend/src/routes/**"
---

# Route Pattern

The files in `frontend/src/routes` are TanStack Router file routes (`routeTree.gen.ts` is generated from them). A route is the entry point of a page: it parses the URL (params, search params), guards access, prefetches the queries the page cannot live without, describes its tab, and renders one view of a feature. It contains no UI and no logic of its own, so every page is wired the same way and the views stay testable.

## File Structure

A page route (`classifier.tsx`, `$sdocId.tsx`, `index.tsx`) exports exactly one `Route`. Options appear in this order (enforced by `local/route-options`); leave out the ones the page does not need.

```tsx
import { Icon } from "@components/icons";
import { booleanSearchParam, FILTER_PARAM, filterSearchParams, sortingModelSearchParam } from "@core/filter";
import { parseIdParam } from "@core/navigation";
import { xxxQueries, XxxView } from "@features/xxx"; // public index.ts only
import { CircularProgress } from "@mui/material";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

// 1. Search schema (only if the page has search params)
const xxxSearchSchema = z.object({
  ...filterSearchParams<XxxColumns>(),
  sortingModel: sortingModelSearchParam(),
  fetchSize: z.coerce.number().default(20),
});

export const Route = createFileRoute("/_auth/project/$projectId/xxx/$xxxId")({
  // 2. Tab (every page under $projectId)
  staticData: {
    tab: true,
    icon: Icon.XXX,
    getTitle: ({ queryClient, params }) => {
      const xxxs = queryClient.getQueryData(xxxQueries.byProject(Number(params.projectId)).queryKey);
      return `Xxx ${xxxs?.[Number(params.xxxId)]?.name ?? ""}`;
    },
  },
  // 3. Params, search params, guards
  params: { parse: ({ xxxId }) => ({ xxxId: parseIdParam(xxxId) }) },
  validateSearch: zodValidator(xxxSearchSchema),
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: "/login" });
  },
  // 4. Route queries
  loaderDeps: ({ search }) => search,
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params, deps }) => ({ xxxsByProjectOptions: xxxQueries.byProject(params.projectId) }),
  loader: async ({ context, params }) => {
    const xxxs = await context.queryClient.ensureQueryData(context.xxxsByProjectOptions);
    if (!xxxs[params.xxxId]) throw notFound();
  },
  pendingComponent: () => <CircularProgress />,
  // 5. View
  component: XxxView,
});
```

## Rules

### Thin routes

- **One view**: `component` is a view imported from a feature's (or core domain's) public `index.ts` (`@features/classifier`). A page route defines no components, hooks or helpers; an overview page gets its own feature (`@features/analysis-overview`).
- **Allowed imports**: `@components` (icons), `@core`, `@features`, `@models`, MUI, TanStack Router/Query, `zod`, `@tanstack/zod-adapter` (boundaries are enforced by ESLint).
- **Layout routes are the exception**: `__root.tsx`, `_auth.tsx`, `_public.tsx` and `$projectId/route.tsx` render the app frame and the global dialogs inline. Name their components `<Name>RouteLayout`, `<Name>RouteErrorBoundary`, `<Name>RouteNotFound` (`<Name>RouteFrame` for a shared wrapper); none of them is exported. Every boundary break there carries an `eslint-disable-next-line` with a reason.
- A route whose segment has several children and only parses a param is a bare `route.tsx` with `params` only (`perspectives/$aspectId/route.tsx`).

### Route queries

- **Route or component?** A query goes in the route if the page is useless without it, the URL (params and search params) fully determines it, and the first render needs it. Everything else (per-row data, dialogs, panels, anything depending on selection or Redux) is started in the component with the domain's hook.
- **`loaderDeps`**: `({ search }) => search`, only when the queries use search params.
- **`context`** is the only place that builds query options, with the factory leaf (never a hook): `({ params, deps }) => ({ ... })`, preceded by the comment `// the query options are built once here; the loader and the view use the same ones`. Name each option after the data it loads plus `Options` (`whiteboardsByProjectOptions`, `sdocDetailOptions`), never after the domain only (`cotaOptions`).
- **`loader`** awaits `context.queryClient.ensureQueryData(context.xxxOptions)` (`ensureInfiniteQueryData` for infinite queries), several with `Promise.all`, and returns nothing. It never builds options itself.
- **Missing entities**: a `$xxxId` route that loads the project's entity map checks the id and `throw notFound()` (rendered by `_auth`'s `notFoundComponent`). Load the dependent queries after the check.
- **`pendingComponent: () => <CircularProgress />`** on every route with a `loader`.
- The view reads the options with `getRouteApi(...).useRouteContext()` and `useSuspenseQuery` (see the feature instructions). No `*ViewLoader.ts` files.

### Params and search params

- **Params** are parsed to numbers in the route that declares them with `parseIdParam` from `@core/navigation`: `params: { parse: ({ xxxId }) => ({ xxxId: parseIdParam(xxxId) }) }`. It throws `notFound()` for a param that is not a positive integer, so a malformed URL shows the not-found page. Never `parseInt` a param in `params.parse` (`staticData.getTitle` gets the raw string params and only uses them to look up the cache, `Number(params.xxxId)`).
- **Search params**: a module-level `const <page>SearchSchema = z.object({...})`, passed as `validateSearch: zodValidator(<page>SearchSchema)`. Every key has a `.default(...)` or is `.optional()`.
- Use the shared schemas from `@core/filter`: `...filterSearchParams<Columns>()` (filter + filter expert mode), `sortingModelSearchParam(default?)`, `booleanSearchParam(default)`. Numbers use `z.coerce.number()`, enums `z.nativeEnum(...)` / `z.enum([...])`. Read the filter as `deps[FILTER_PARAM]`.

### Guards

- **`beforeLoad`** is only for guards: it throws `redirect(...)` (login, already authenticated) and never returns context or builds query options. It is synchronous. Protected pages live under `_auth`, public pages under `_public`.

### Tabs (`staticData`)

- Every page route under `$projectId/` (not `route.tsx`) declares `staticData: { tab: true, icon: Icon.XXX, getTitle }`. Routes outside a project (`me`, `projects`, `_public/*`) have no `staticData`.
- A static title is `getTitle: () => "Document Search"`. A dynamic title reads the entity from the cache with the factory's typed key and is `<Kind> <name>` with an empty name as fallback: `` `Whiteboard ${whiteboards?.[Number(params.whiteboardId)]?.title ?? ""}` ``. `params` are untyped there, so wrap them in `Number(...)`.

## Examples

See:

- [classifier.tsx](../../frontend/src/routes/_auth/project/$projectId/classifier.tsx) — the canonical page route with two route queries
- [search.tsx](../../frontend/src/routes/_auth/project/$projectId/search.tsx) — search schema with the shared helpers, `loaderDeps`, infinite query
- [$whiteboardId.tsx](../../frontend/src/routes/_auth/project/$projectId/whiteboard/$whiteboardId.tsx) — param parsing, dynamic title, `notFound()`
- [\_auth.tsx](../../frontend/src/routes/_auth.tsx) — a layout route with guard, error and not-found components
