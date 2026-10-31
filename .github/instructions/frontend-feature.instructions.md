---
applyTo: "frontend/src/features/**"
paths:
  - "frontend/src/features/**"
---

# Feature Folder Pattern

A feature is one folder in `frontend/src/features/` that holds a page (or a group of pages) and the dialogs and buttons that belong to it, e.g. `classifier`, `whiteboard`, `health`. Features sit between the routes and `core`: a route renders a feature's views, a feature builds on `core`, `components`, `api`, `hooks`, `store`, `models` and `utils`. All features share one layout, so every file has an obvious place and the import rules below can be enforced by ESLint.

## File Structure

```text
features/<feature-name>/          kebab-case, named after the feature (not the route)
├── index.ts                      1. public entry: the only file other code may import
├── api/                          2. optional: <x>Queries.ts, <x>Hooks.ts (data used by this feature only)
├── store/                        3. optional: <x>Slice.ts (client state of this feature)
├── views/                        4. one folder per public view
│   ├── main/
│   │   ├── XView.tsx             page view, exported by index.ts
│   │   ├── _components/          components used only by this view
│   │   ├── _hooks/               hooks used only by this view (incl. <x>RouteAPI.ts)
│   │   └── _types/, _utils/
│   ├── dialog/XDialog.tsx        a dialog rendered by a route
│   └── button/XButton.tsx        a button embedded elsewhere
├── _components/                  5. optional: components shared by several views
├── _hooks/, _types/, _utils/     5. optional: shared by several views or by api/ and store/
└── _styles/                      5. optional: css shared by several views
```

```ts
// index.ts — re-exports only, in this order
export * from "./api/classifierQueries"; // the query factory, if the feature has one
export { classifierReducer } from "./store/classifierSlice"; // one line per slice, the reducer only
export * from "./views/button/ClassifierInferenceButton"; // every public view file
export * from "./views/dialog/ClassifierDialog";
export * from "./views/main/ClassifierView";
```

## Rules

### Folders

- **Allowed root entries**: `index.ts`, `api/`, `store/`, `views/`, `_components/`, `_hooks/`, `_types/`, `_utils/`, `_styles/`. No other files or folders at the feature root (lint: `local/feature-folder-layout`).
- **`api/`** exists if the feature owns server data that no other domain uses. Its files follow `frontend-api.instructions.md`. Data used by several features lives in `core/<domain>/api/` instead.
- **`store/`** exists if the feature has client state that outlives a component (filters, selections, dialog state). Slices follow `frontend-slice.instructions.md` and are registered in `store/store.ts`.
- **`views/<name>/`** holds one public view file plus its private folders; everything else goes into `_components/`, `_hooks/`, `_types/`, `_utils/`. No files directly in `views/`, no `index.ts` inside a view folder (lint: `local/feature-folder-layout`).
- **View folder names** are kebab-case roles. Use the standard name when it fits:
  - `main` — the feature's only page (`views/main/HealthView.tsx`)
  - `dashboard` — the page that lists the feature's entities (`views/dashboard/CotaDashboardView.tsx`)
  - `detail` — the page of one entity (`views/detail/WhiteboardView.tsx`)
  - `dialog` — a dialog the route renders (`views/dialog/ClassifierDialog.tsx`)
  - `button` — a button other code embeds (`views/button/DocumentUploadButton.tsx`)
  - Otherwise name the view after what it shows: `map`, `login`, `register`, `fallback`, `document-search`.
- **Public view names** end in `View` (pages), `Dialog` or `Button` and match the role: `XDashboardView` in `dashboard/`, `XView` in `detail/`. Dialog internals follow `frontend-dialog.instructions.md`.

### Private Folders

- **Prefix**: a folder starting with `_` (`_components`, `_hooks`, `_types`, `_utils`, `_styles`) is private to its parent folder. Only files inside that parent may import it (lint: `local/no-private-folder-scope-violation`).
- **Placement**: put a private file in the lowest folder shared by all its users. Used by one view → `views/<name>/_components/`. Used by two views (or by `api/`/`store/` and a view) → the feature-level `_components/` / `_types/`. Move it down when it loses its other users.
- **No sibling imports**: a relative import may go up and down its own branch, but may not cross into a sibling view (`views/main` → `views/dialog/...`). Share through a parent folder or a shared folder (`api`, `store`, `_components`, `_hooks`, `_types`, `_utils`) instead (lint: `local/no-scope-violations`).
- Private folders may nest (`views/main/_components/toolbar/_components/`) and may have their own `index.ts`.

### Public Entry (`index.ts`)

- **Only re-exports** from `./api/<x>Queries`, `./store/<x>Slice` and `./views/<name>/<File>` (lint: `local/feature-index-exports`; private folders are blocked by the index-file rule).
- **Query factory**: export the `*Queries.ts` file, so routes can build their context options. Never export `*Hooks.ts`; hooks are used inside the feature only.
- **Slices**: export only the reducer (`export { xReducer }`), never the actions or selectors.
- **Views**: export every view that a route or `store/store.ts` needs; nothing else.

### Imports

- **Inside the feature**: relative imports only, never `@features/<self>/...` (lint: `local/no-alias-within-same-domain`).
- **Other folders**: path aliases (`@core/tag`, `@components/...`, `@store/...`). Import `core` domains through their public entry `@core/<domain>`, never deeper (lint: `local/no-internal-modules-public-entry`).
- **Other features**: never. A feature may not import another feature; routes compose features (lint: `boundaries/element-types`). Code that two features need (components, hooks, types, helpers) moves to `core/<domain>` or to `components/`, `hooks/`, `utils/`; never copy it into the second feature. The one exception is embedding another feature's entry view, such as a button that opens it (`LLMAssistantButton` in `SearchDocumentTable.tsx`): import it from the feature's `index.ts` with `// eslint-disable-next-line boundaries/element-types`.
- **Redux**: a feature reads and writes its own slices and the global slices in `store/global/`, never another feature's slice (lint: `local/no-cross-slice-access`).

### Page Views and the Route

The route builds the query options once in its `context` and prefetches them in its `loader` (see `frontend-route.instructions.md`). The page view only reads them:

```tsx
const routeApi = getRouteApi("/_auth/project/$projectId/classifier");

export function ClassifierView() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });
  const { classifiersByProjectOptions } = routeApi.useRouteContext();
  const { data: classifiers } = useSuspenseQuery({ ...classifiersByProjectOptions, select: (d) => Object.values(d) });
  // ...
}
```

- **Route API**: a page view used alone defines `const routeApi = getRouteApi("<route id>")` in its own file. If its components need it too, define it once in `views/<name>/_hooks/<x>RouteAPI.ts` as `export const XRouteAPI = getRouteApi(...)` and import it everywhere. `getRouteApi` is called nowhere else (lint: `local/feature-route-api-location`).
- **Route data**: params with `routeApi.useParams()`, search params with `routeApi.useSearch()`, query options with `routeApi.useRouteContext()`.
- **Suspense queries** take the options from the route context, optionally spread with `select`: `useSuspenseQuery({ ...xOptions, select })`. Never build them again from a factory in the view (lint: `local/feature-suspense-query-from-route`).
- **Other queries** (per row, dialogs, panels, selection-dependent) use the domain's hooks or `useQuery(xQueries.leaf(...))` in the component that needs them.

## Examples

See:

- [classifier](../../frontend/src/features/classifier/index.ts) — `api/`, `store/`, a page, a dialog and a button view, and a feature-level `_components/` shared by the page and the dialog.
- [whiteboard](../../frontend/src/features/whiteboard/index.ts) — `dashboard/` + `detail/` pages; the detail page shares its route API via `views/detail/_hooks/whiteboardRouteAPI.ts`.
- [ClassifierView.tsx](../../frontend/src/features/classifier/views/main/ClassifierView.tsx) — a page view reading its options from the route context.
