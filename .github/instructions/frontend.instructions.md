---
applyTo: "frontend/**"
paths:
  - "frontend/**"
---

# Frontend

Cross-cutting rules for all frontend code (React, TypeScript, Vite). The patterns of a single file kind live in their own instruction files, which apply automatically by path:

| Files                                                                              | Instructions                               |
| ---------------------------------------------------------------------------------- | ------------------------------------------ |
| `**/api/*Queries.ts`, `**/api/*Hooks.ts` (TanStack Query)                          | `frontend-api.instructions.md`             |
| `routes/**` (TanStack Router, route queries, search params)                        | `frontend-route.instructions.md`           |
| `features/**` (feature folder layout, `index.ts`, page views)                      | `frontend-feature.instructions.md`         |
| `*Slice.ts`, `store/store.ts` (Redux, where state belongs)                         | `frontend-slice.instructions.md`           |
| `*Dialog.tsx`, `store/global/dialogBus*.ts` (open state, chrome, forms in dialogs) | `frontend-dialog.instructions.md`          |
| `core/filter/**`, `*FilterTable.tsx`, `*FilterSlice.ts`                            | `frontend-filter.instructions.md`          |
| `core/*/renderer/*Renderer.tsx`                                                    | `frontend-entity-renderer.instructions.md` |

## Libraries

Dependencies are declared in `frontend/package.json` and managed with npm. Use what is there:

- React 19 (`/reactjs/react.dev` on context7)
- TanStack Router (file routes), TanStack Query v5 (server state, `/tanstack/query`)
- Redux Toolkit 2 with redux-persist (global client state, `/reduxjs/redux-toolkit`)
- React Hook Form 7 (forms, `/react-hook-form/documentation`)
- MUI v6 incl. icons, lab and Material React Table (UI, `/mui/material-ui`, https://mui.com/material-ui/llms.txt)
- zod through `@tanstack/zod-adapter` (search-param validation), Vite (build, dev server)

## Folder Structure

`frontend/src` is layered `routes` → `features` → `core` → `api`/`components`/`hooks`/`store`/`models`/`utils`. `eslint-plugin-boundaries` enforces which layer may import which (`eslint.config.mjs`, "ARCHITECTURE BOUNDARIES").

- `routes/`: TanStack Router file routes; thin, they wire a feature's view to a URL. `routeTree.gen.ts` is generated.
- `features/<feature>/`: one folder per page or feature. A feature never imports another feature.
- `core/<domain>/`: domain code that several features share (code, tag, memo, folder, source document, annotations, metadata, filter, job, navigation, notification, ...). Each domain has an `api/` folder for its queries and hooks, its components in the domain root or in role folders (`dialog/`, `explorer/`, `table/`, `menu/`, `renderer/`), and an `index.ts` as its public entry.
- `api/`: the generated client (`openapi/`, never edit by hand; regenerate with `just update-api`), the `queryClient`, the websocket cache-sync code (`cache-sync/`, see its README) and the queries no domain owns (`general/`, `statistics/`).
- `components/`: generic UI without domain logic (`form-inputs/`, `icons/`, `DATSDialogHeader`, `ExpandableRenderer`, `tree-explorer/`, ...).
- `hooks/`: generic hooks (`useDialog`, `useDebounce`, `useTableInfiniteScroll`, ...).
- `store/`: the Redux store, the global slices (`global/`) and the reusable slice parts (`generic/`).
- `models/`: TypeScript types generated from the OpenAPI spec.
- `plugins/`: setup of third-party libraries (MUI theme, TanStack, websocket, Sentry); only `main.tsx` uses them.
- `utils/`, `styles/`, `types/`: helpers without domain knowledge, global styles, global type declarations.

## File Naming

ESLint (`check-file`) enforces the casing.

- `.tsx` files are PascalCase and export a component of the same name (`CodeCreateDialog.tsx`); `.ts` files are camelCase (`codeQueries.ts`, `useDebounce.ts`).
- Folders are kebab-case; a leading `_` makes a folder private to its parent (`_components`, `_hooks`, `_types`, `_utils`).
- The suffix states the role: `*Queries.ts`, `*Hooks.ts`, `*Slice.ts`, `*View.tsx`, `*Dialog.tsx`, `*FilterTable.tsx`, `*Renderer.tsx`, `use*.ts`, `*Utils.ts`.

## Imports

- Use the path aliases (`@api`, `@components`, `@core`, `@features`, `@hooks`, `@models`, `@store`, `@utils`, ...) for other top-level folders and relative imports inside the same domain or feature (`local/enforce-global-aliases`, `local/no-alias-within-same-domain`).
- Import a core domain or feature only through its `index.ts` (`import { CodeHooks } from "@core/code"`); deep imports are auto-fixed to the public entry (`local/no-internal-modules-public-entry`).
- No `src/...` imports, no bare `"."`/`".."`, no `.ts`/`.tsx` extensions.

## Components

- Functional components only. Type props with an interface named `<Component>Props`; extend MUI props with `Omit<>` to avoid conflicts (see [EditableTypography.tsx](../../frontend/src/components/EditableTypography.tsx)).
- Prefix event handlers with `handle` (`handleClick` for `onClick`); do not import React unless it is used directly.
- Split large components into focused sub-components in a private `_components` folder. A component that needs data and is also rendered from data comes as `XWithData` / `XWithoutData` (see the renderer instructions).
- Use `memo()` for components that receive complex props or render in long lists, and `useMemo`/`useCallback` for values and callbacks passed to memoized children or used in effect dependencies. The React Compiler is not enabled; `eslint-plugin-react-hooks` checks dependency arrays.
- Icons come from `getIconComponent(Icon.X)` (`@components/icons`), so every entity uses the same icon everywhere.

## State

Choose the home of a piece of state by its kind; [frontend-slice.instructions.md](frontend-slice.instructions.md) has the full decision list.

- **Server state** → TanStack Query, through the domain's query factory and hooks object ([frontend-api](frontend-api.instructions.md)). Never call `api/openapi` services from components.
- **Shareable, URL-addressable state** (filters, sorting, selected tab) → route search params ([frontend-route](frontend-route.instructions.md)).
- **Global client state** (selections, preferences, open dialogs) → Redux with `useAppSelector`/`useAppDispatch` from `@store/storeHooks`.
- **Form state** → React Hook Form with the `@components/form-inputs` controls (`FormText`, `FormNumber`, `FormSwitch`, `FormColorPicker`, `FormMenu`, ...) and `ErrorMessage` from `@hookform/error-message`; forms in dialogs follow [frontend-dialog](frontend-dialog.instructions.md).
- **Local UI state** (hover, a toggled section) → `useState`.

## Feedback and Errors

- Mutations report through `meta`: `successMessage` and `errorMessage` (string or function, typed in `plugins/tanstack/mutationMeta.ts`) are shown as snackbars by the `MutationCache` in `api/queryClient.ts`; `datsEvent` writes the result into the caches. Do not open snackbars in `onError`/`onSuccess` for this.
- Other notifications use `useOpenSnackbar()`; confirmations use `useOpenConfirmationDialog()` (both `@core/notification`).
- Render query errors and loading states explicitly (`isError`, `isLoading`, or suspense with the route's `pendingComponent` and error component).
- Protected pages are children of the `_auth` route, which redirects to the login.

## TypeScript

- Never use `any`; avoid `unknown` unless it is truly necessary; prefer correct types over assertions (`as`, `!`).
- Use the generated models from `@models` (`CodeRead`, `CodeCreate`, `CodeUpdate`) instead of redefining API shapes.
- Do not pass explicit generics to TanStack hooks (`useQuery<T>`); type the service call in the factory.

## Tooling

- `just lint frontend` (ESLint with the custom rules in `frontend/eslint-dats-rules.js`), `just typecheck frontend` (tsc), `just format frontend` (Prettier) must pass; pre-commit runs them.
- New architecture rules become ESLint rules in `eslint-dats-rules.js` with a config block in `eslint.config.mjs` that names the instruction file it enforces.
- After a backend API change, regenerate the client and models with `just update-api` (needs a running backend).
