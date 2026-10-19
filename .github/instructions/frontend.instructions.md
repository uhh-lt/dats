---
applyTo: "frontend/**"
paths:
  - "frontend/**"
---

# Frontend

The frontend is built using Typescript with React as the web framework.
It interacts with the backend through RESTful API endpoints.
It follows a component-based architecture, organizing UI elements into reusable components.

## Libraries and Frameworks

Dependencies are listed in package.json and managed with npm.

React for building user interfaces

- (react) v19.2
- context7: /reactjs/react.dev

Tanstack Router for client-side routing

- (@tanstack/react-router) v1.166

Tanstack Query for data fetching and server state management

- (@tanstack/react-query) v5.90
- context7: /tanstack/query

Redux Toolkit for global state management

- (@reduxjs/toolkit) v2.11
- context7: /reduxjs/redux-toolkit

React Hook Form for form state management

- (react-hook-form) v7.71
- context7: /react-hook-form/documentation

MUI for UI components, styling, theming, and icons

- (@mui/material v6.5, @mui/icons-material v6.5, @mui/lab v6.0.1-beta.36)
- docs: https://mui.com/material-ui/getting-started/
- llms.txt: https://mui.com/material-ui/llms.txt
- context7: /mui/material-ui

Vite as the build tool and development server

- (vite) v8.0
- context7: /vitejs/vite

## Folder Structure

- `/frontend/bin`: Various scripts
- `/frontend/public`: Public assets like logos
- `/frontend/src`: Main application code. The layers are `routes` → `features` → `core` → `api` (enforced by ESLint)
  - `/routes`: TanStack Router file routes (query options in `context`, prefetch in `loader`)
  - `/features`: One folder per page or feature (`views/`, `store/`, `api/`, ...); a feature may not import another feature
  - `/core`: Domain code that several features share (code, tag, memo, ...), with its own `api/` folder
  - `/api`: Generated API client (`services/`, `core/`), the `queryClient`, the cache-sync code (`cache-sync/`) and global queries/hooks that no domain owns (`general/`, `statistics/`)
  - `/components`: Generic UI components without domain logic
  - `/hooks`: Generic hooks (`useDialog`, `useDebounce`, ...)
  - `/store`: Redux Toolkit store with the global (`global/`) and generic (`generic/`) slices
  - `/models`: Types generated from the OpenAPI spec
  - `/plugins`: Setup of third-party libraries (MUI, Tanstack Query, websocket, Sentry)
  - `/styles`, `/types`, `/utils`: Styles, global type declarations, utility functions

## File Naming Conventions

- **React Components**: PascalCase with `.tsx` extension (e.g., `EditableTypography.tsx`, `CodeCreateDialog.tsx`)
- **Custom Hooks**: Lowercase with `use` prefix and `.ts` extension (e.g., `useDebounce.ts`, `useDialog.ts`)
- **Query factories**: `{domain}Queries.ts` in the domain's `api/` folder (e.g., `core/tag/api/tagQueries.ts`)
- **API hooks**: `{domain}Hooks.ts` next to it, exporting one `{Domain}Hooks` object with all hooks of the domain: query hooks, data-deriving hooks and mutations (e.g., `core/tag/api/tagHooks.ts` exports `TagHooks`)
- **Redux Slices**: `{featureName}Slice.ts` (e.g., `annoSlice.ts`, `projectSlice.ts`)
- **Utilities**: Descriptive names matching their purpose (e.g., `ColorUtils.ts`, `DateUtils.ts`)
- **Directories**: Lowercase with hyphens for multi-word names (e.g., `/form-inputs`, `/tree-explorer`)

## Component Structure

**Functional Components with Hooks**:

- Use functional components exclusively; avoid class-based components
- Leverage React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) for component logic
- See [EditableTypography.tsx](../../frontend/src/components/EditableTypography.tsx) for a component with hooks and ref management

**Type Safety**:

- Define component props as interfaces with proper `extends` patterns for extending MUI component props
- Example from [EditableTypography.tsx](../../frontend/src/components/EditableTypography.tsx):
  ```tsx
  interface EditableTypographyProps {
    value: string;
    onChange: (value: string) => void;
    whiteColor: boolean;
    stackProps?: Omit<StackProps, "direction" | "alignItems">;
  }
  function EditableTypography({...}: EditableTypographyProps & Omit<TypographyProps<"div">, ...>) { ... }
  ```
- Use `Omit<>` and `Exclude<>` utilities to prevent prop conflicts when extending component types

**Component Patterns**:

- Prefer splitting complex components into smaller, focused sub-components
- When a component needs both data fetching and UI, consider creating separate `WithData` and `WithoutData` variants
- Use `React.memo()` for components that receive complex props to prevent unnecessary re-renders

## State Management

### Tanstack Query: Use for ALL SERVER state (data from API, loading, errors)

The rules below are the convention for new and migrated code.

**Where do queries and mutations live?** In the domain that owns the data, in a public `api/` folder next to the domain's code:

- Every `api/` folder has two files: `<entity>Queries.ts` (the query factory) and `<entity>Hooks.ts` (the `<Entity>Hooks` object). A folder without hooks (nothing that adds value) has only the queries file; there are no empty hooks objects. A folder that has no queries has only the hooks file, which defines the mutation-key root itself (`const documentSamplerKey = ["documentSampler"] as const`), like `core/auth/api/authHooks.ts`.
- Used by core and by several features (code, tag, memo, folder, project, source document, user, span/bbox/sentence annotations, project metadata, sdoc metadata): `core/<domain>/api/`.
- Used by exactly one feature (classifier, COTA, whiteboard, document upload, LLM assistant, ...): `features/<feature>/api/`. Its job queries (`xxxQueries.job`) are part of it.
- **Background jobs** are always the `job` object of the domain factory, built by `createJobQueries("<root key>", fetchJob, fetchJobs?)` from `@core/job`: `xQueries.job.byId(jobId)` and, if the backend lists them, `xQueries.job.byProject(projectId)`. Components follow a job with `useLiveJob(xQueries.job.byId(jobId), initialJob?)` (there is no per-domain live hook). Start mutations use `mutationKey: [...xQueries.job.all(), "start"]`. The websocket cache-sync code writes job updates into these caches and runs the completion side effects (`cache-sync/_utils/jobCacheUtils.ts`).
- Used by several features but owned by none (`general`, `statistics`): `api/<name>/` (global).
- Generic helpers without domain knowledge (e.g. `rollbackOptimisticUpdate`) belong to `src/utils`, they get the `queryClient` as a parameter.
- Optimistic updates: the mutations that write a cache optimistically use `mutationKey: [...xQueries.optimisticMutationScope(), "update"]`, and `rollbackOptimisticUpdate` / `isMutating` get that scope, never the domain root (other mutations of the domain must not block the rollback).
- Each domain's `index.ts` exports its `api/` files, so other code imports `import { CodeHooks } from "@core/code"`. Inside the domain use relative imports.
- A hook that reads the Redux slice of a feature stays in that feature (`useLabelDocs`); `core` may not read feature slices.
- Only the cache-sync code (`api/cache-sync`) may import `core/<domain>/api/<file>` directly (ESLint exemption), because it writes the caches of every domain.
- Do not create new root keys that exist already; the root of a factory is its domain (`["tag", ...]`). The file is named after that root key: `all: () => ["tag"]` lives in `tagQueries.ts` (enforced by lint).

**Queries are defined once, in a query factory** (`<domain>/api/<domain>Queries.ts`, e.g. [tagQueries.ts](../../frontend/src/core/tag/api/tagQueries.ts)):

- A factory is a plain object with `all()`, scope prefixes (`xxxScope()`) and `queryOptions(...)` leaves. It contains no React.
- Keys are hierarchical: **domain, then scope, then params**, e.g. `["tag", "project", projectId]`.
- A leaf bundles `queryKey` and `queryFn` together and takes identity params only (ids, filters). Never add `enabled`, `select` or `staleTime` parameters. A missing id returns `skipToken` as the `queryFn`. `useSuspenseQuery` and route loaders do not accept `skipToken`: a query that is used by suspense or loaders takes a strict id (`id: number`) with a normal `queryFn`, and call sites that may have no id add `enabled` themselves.
- Never write a `queryKey` array by hand and never use explicit generics (`useQuery<T>`); type the service call instead. ESLint enforces this: a `queryKey` array literal is only allowed in `*Queries.ts` files.
- Never call API service methods directly from components; go through a factory.

**Components use the `{Domain}Hooks` object when a hook adds value, otherwise `useQuery` with the factory** (`<domain>/api/<domain>Hooks.ts`, e.g. [codeHooks.ts](../../frontend/src/core/code/api/codeHooks.ts)):

- A hook exists only if it adds something: selection (`select`), `enabled`, the project id from Redux, polling, composition of several queries, or a mutation. Components call `CodeHooks.useGetCode(codeId)`, `TagHooks.useGetAllTags()`, `TagHooks.useCreateTag()`.
- A hook that only forwards its arguments to one factory leaf is forbidden. Components call `useQuery(sdocQueries.annotators(sdocId))` directly.
- A hook that only forwards to another hook of its domain with preset arguments (an alias) is forbidden; give the real hook optional parameters instead (see `TagHooks.useGetAllTags`).
- In a `*Queries.ts` file, do not extract a `fetchX` helper that is used by one leaf only; write the `queryFn` inline. A module-level helper is fine only when several leaves share it.
- A hook never defines a query itself. It builds on the factory: `useQuery({ ...tagQueries.byProject(projectId), select, enabled })`. Key and `queryFn` exist only in `<domain>Queries.ts`; this includes the queries that load the column infos of the filter tables (`sdocQueries.tableInfo`, ...). The column infos are never copied into Redux: the filter dialogs and tables get the leaf's options (`tableInfoOptions={memoQueries.tableInfo(projectId)}`; wrap them in `useMemo` where a memoized component receives them) and read the map with `TableInfoHooks.useColumnInfoMap(options)`. Column visibility defaults (hidden metadata columns) are derived with `TableInfoHooks.useColumnVisibility(options, storedModel)`; the slice stores only what the user chose.
- Filtered, sorted, paginated listings of an entity are always named the same: `search(params)`, `searchScope()` (invalidation prefix) and `tableInfo(...)` for the column infos; a variant is `searchGrouped`. No nested `search` object and no `table` leaf for entity searches (`sdocQueries.search`, `spanAnnotationQueries.search`, `memoQueries.searchGrouped`). The leaf takes the backend request (without the page): `memoQueries.search({ project_id, filter, sorts, page_size })`. Callers convert UI state with `toSorts<Column>(sortingModel)` from `@core/filter`; the leaf does no UI translation.
- The `{Domain}Hooks` object contains query hooks, data-deriving hooks and mutations; a hook that reads the Redux slice of a feature is part of that feature's object.
- Cache access (`setQueryData`, `getQueryData`, `invalidateQueries`) uses the typed key `tagQueries.byProject(id).queryKey` or a scope prefix like `tagQueries.byProjectScope()`. This keeps the data type inferred and keeps invalidation prefix-based.
- Data normalization with Record maps (`Record<id, data>`) for O(1) access is fine when the cache-sync code relies on that shape; comment why.

**Mutations** are hooks in the same `{Domain}Hooks` object ([tagHooks.ts](../../frontend/src/core/tag/api/tagHooks.ts), `TagHooks.useCreateTag`):

- Every mutation has a `mutationKey` that starts with the domain root: `mutationKey: [...tagQueries.all(), "create"]`. ESLint fails a `useMutation` without a `mutationKey`.
- Cache updates are not written in components. Tag the mutation with `meta.datsEvent`; the cache-sync "brain" ([api/cache-sync](../../frontend/src/api/cache-sync/README.md)) writes the result into the cache.
- Prefer `mutate` over `mutateAsync`. Necessary logic (invalidation) goes in the `useMutation` callbacks; UI actions (redirects) in the `mutate` callbacks.

**Route or component? Decide where a query is started (the factory is the same in both cases):**

- A query goes in the **route** if the page is useless without it, the URL (params and search params) fully determines it, and it is needed on first render. Example: the classifier lists, the document search result.
- Every other query is started in the **component** through the domain's hook (`SdocHooks.useGetDocument(id)`): per-row data, dialogs, panels, tabs, anything that depends on selection or Redux state, dependent queries, polling.
- Route queries follow one rule, see [classifier.tsx](../../frontend/src/routes/_auth/project/$projectId/classifier.tsx):
  1. `loaderDeps: ({ search }) => search` (only if the route has search params that the queries use).
  2. `context: ({ params, deps }) => ({ xxxOptions: xxxQueries.leaf(...) })` builds the options **once**. This is the only place that builds them. Name each option after the data it loads, like the factory leaf (`whiteboardsByProjectOptions`, `sdocDetailOptions`), never after the domain only (`cotaOptions`).
  3. `loader: async ({ context }) => { await context.queryClient.ensureQueryData(context.xxxOptions) }` awaits them and returns nothing.
  4. The view reads them with `routeApi.useRouteContext()` and calls `useSuspenseQuery({ ...xxxOptions, select })`. It never builds the options again.
  5. A dynamic tab title reads the entity from the cache in `staticData.getTitle({ queryClient, params })`.
- Do not write `*ViewLoader.ts` files. Use `beforeLoad` only for guards (e.g. the login redirect), not for query options.
- The route builds its options with the factory (not the hook), because the loader and the view must share exactly the same options; its view uses the options from the context.
- If a query seeds other caches (e.g. the whiteboard content), do that in the `queryFn` of the factory, not in the route.

### Redux Toolkit: Use for GLOBAL CLIENT state (dialogs, filters, selections)

- Use typed selector/dispatch hooks: `useAppDispatch()` and `useAppSelector()` from [storeHooks.ts](../../frontend/src/store/storeHooks.ts)
- Create slices for each feature (e.g., annotation, project, search, see [annoSlice.ts](../../frontend/src/features/annotation/store/annoSlice.ts))

### React Hook Form: Use for FORM STATE (input values, validation state, form submission)

**React Hook Form Integration**:

- Use `useForm()` hook to manage form state and validation
- Wrap form inputs with `Controller` from React Hook Form
- See [FormText.tsx](../../frontend/src/components/form-inputs/FormText.tsx) for input wrapper pattern
- Use [form-inputs components](../../frontend/src/components/form-inputs) for consistent form controls:
  - `FormText`, `FormTextMultiline`, `FormNumber`, `FormPassword`
  - `FormEmail`, `FormDate`, `FormSwitch`, `FormColorPicker`
  - `FormMenu`, `FormFreeSolo`, `FormChipList`

**Validation**:

- Define validation rules in `useForm()` hook via `rules` property in `Controller`
- Display errors with `<ErrorMessage>` component from @hookform/error-message
- Example from [CodeCreateDialog.tsx](../../frontend/src/core/code/dialog/CodeCreateDialog.tsx):
  ```tsx
  import { ErrorMessage } from "@hookform/error-message";
  // In JSX: <ErrorMessage errors={errors} name="fieldName" />
  ```

**Form Reset**:

- Use `useEffect()` to reset form when dialog opens with initial values
- Example from [CodeCreateDialog.tsx](../../frontend/src/core/code/dialog/CodeCreateDialog.tsx)

### React Hooks: `useState()` for LOCAL CLIENT state

- Use for truly local state that doesn't need to be shared (e.g., hover states, temporary UI states)

## Custom Hooks

**Create Custom Hooks for Reusable Logic**:

- Extract component logic into custom hooks when it's used in multiple components
- Examples: [useDialog.ts](../../frontend/src/hooks/useDialog.ts) (dialog state management), [useDebounce.ts](../../frontend/src/hooks/useDebounce.ts) (value debouncing)
- File location: `/frontend/src/hooks` for generic hooks; domain hooks live in the domain's `api/` folder or next to the component

**Hook Design Patterns**:

- Return objects with clear, descriptive names: `{ isOpen, open, close, toggle }`
- Include optional callbacks: `{ onOpen?: () => void; onClose?: () => void }`
- For complex logic with multiple related hooks, create composition (see [useTableInfiniteScroll.ts](../../frontend/src/hooks/useTableInfiniteScroll.ts))

## TypeScript & Typing

**Generics for Flexibility**:

- Use generic types for hooks that work with multiple data types
- Example from [useTableInfiniteScroll.ts](../../frontend/src/hooks/useTableInfiniteScroll.ts):
  ```tsx
  interface UseTransformInfiniteDataProps<T, U> {
    data: InfiniteData<T> | undefined;
    flatMapData: (page: T) => U[];
    lengthData?: (data: U[]) => number;
  }
  ```

**Generated API Types**:

- API types are auto-generated from OpenAPI spec; use them consistently
- Import models from `frontend/src/models/` (`@models/...`)
- Type suffixes indicate operation: `Read` (GET), `Create` (POST), `Update` (PUT)

**Avoid `any` Type**:

- Never use `any`; use `unknown` if type is truly unknown, or define proper interface
- Use `Record<>` for maps instead of object literals when type-safe

## Performance Optimization

**Memoization**:

- Use `useMemo()` for expensive computations, derived state, and filtered data lists
- Use `useCallback()` for ALL callback functions passed as props (dependency injection)
- Example: [CodeCreateDialog.tsx](../../frontend/src/core/code/dialog/CodeCreateDialog.tsx)

**Dependency Arrays**:

- Be explicit about dependencies; never leave empty with actual dependencies
- Use eslint-plugin-react-hooks to catch missing dependencies

**Data Transformation**:

- Transform API responses to lookup maps (Record) for O(1) access instead of find()
- Cache transformed structures with `useMemo`

**Infinite Scrolling**:

- Use [useTableInfiniteScroll.ts](../../frontend/src/hooks/useTableInfiniteScroll.ts) hook for paginated table data
- Implements smart fetching trigger at 400px from table bottom

## Error Handling

**Mutation Error Handling**:

- Configure error handling in mutation `onError` callback or globally via `MutationCache`
- Set custom messages in mutation `meta` property
- Errors automatically display in global snackbar notification

**Query Error States**:

- Check `isError` and `error` properties from `useQuery()` result
- Display error UI conditionally based on these states
- Implement retry logic via Tanstack Query's built-in retry mechanism

**Protected Routes**:

- Protected routes are children of the `_auth` route ([\_auth.tsx](../../frontend/src/routes/_auth.tsx)); it redirects to the login page and preserves the redirect location

## Imports

- Use the path aliases (`@api`, `@core`, `@features`, `@components`, `@hooks`, `@models`, `@store`, `@utils`) for other folders and relative imports inside the same domain; other code imports a core/feature domain only through its `index.ts`
- Imports are sorted by the editor's organize-imports on save; remove unused imports before committing

## Documentation

- Write JSDoc comments for all public components
- Document props, usage examples, and special behaviors

## Workflow: Creating a Feature with All Patterns

1. **Step 1: Define the query factory** (e.g., `core/code/api/codeQueries.ts`)
2. **Step 2: Create the hooks object** with query hooks, derived hooks and mutations (e.g., `core/code/api/codeHooks.ts`)
3. **Step 3: Create Components** (e.g., CodeTable.tsx, CodeCreateDialog.tsx)
4. **Step 4: Use in Views**

## Tools

### Use the mui-mcp server to answer any MUI questions --

- 1. call the "useMuiDocs" tool to fetch the docs of the package relevant in the question
- 2. call the "fetchDocs" tool to fetch any additional docs if needed using ONLY the URLs present in the returned content.
- 3. repeat steps 1-2 until you have fetched all relevant docs for the given question
- 4. use the fetched content to answer the question
