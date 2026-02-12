---
applyTo: "frontend/**/*.ts, frontend/**/*.tsx"
---

# Frontend

The frontend is built using Typescript with React as the web framework.
It interacts with the backend through RESTful API endpoints.
It follows a component-based architecture, organizing UI elements into reusable components.

## Libraries and Frameworks

Dependencies are listed in package.json and managed with npm.

React for building user interfaces
- (react) v18.3.1
- context7: /reactjs/react.dev

React Router for client-side routing
- (react-router-dom) v6.26.2

Tanstack Query for data fetching and server state management
- (@tanstack/react-query) v5.67.2
- context7: /tanstack/query

Redux Toolkit for global state management
- (@reduxjs/toolkit) v2.2.8
- context7: /reduxjs/redux-toolkit

React Hook Form for form state management
- (react-hook-form) v7.53.0
- context7: /react-hook-form/documentation

MUI for UI components, styling, theming, and icons
- (@mui/material v6.4.6, @mui/icons-material v6.4.6, @mui/lab v6.0.0-beta.30)
- docs: https://mui.com/material-ui/getting-started/
- llms.txt: https://mui.com/material-ui/llms.txt
- context7: /mui/material-ui

Vite as the build tool and development server
- (vite) v6.2.1
- context7: /vitejs/vite

## Folder Structure

- `/frontend/bin`: Various scripts
- `/frontend/public`: Public assets like logos
- `/frontend/src`: Main application code
  - `/api`: Generated API client and Hooks for API interactions
  - `/auth`: Authentication and authorization logic
  - `/components`: Reusable React components
  - `/layouts`: Layout components for different page structures
  - `/plugins`: Configurations for third-party plugins and integrations (MUI, Tanstack Query, Redux Toolkit, etc.)
  - `/router`: React Router route definitions
  - `/store`: Redux Toolkit store configuration
  - `/utils`: Utility functions and helpers
  - `/views`: Page components representing different views/screens

## File Naming Conventions

- **React Components**: PascalCase with `.tsx` extension (e.g., `EditableTypography.tsx`, `CodeCreateDialog.tsx`)
- **Custom Hooks**: Lowercase with `use` prefix and `.ts` extension (e.g., `useDebounce.ts`, `useDialog.ts`)
- **API Hooks**: Named `{Entity}Hooks.ts` bundling multiple related hooks (e.g., `CodeHooks.ts`, `SdocHooks.ts`)
- **Redux Slices**: `{featureName}Slice.ts` (e.g., `annoSlice.ts`, `projectSlice.ts`)
- **Utilities**: Descriptive names matching their purpose (e.g., `ColorUtils.ts`, `DateUtils.ts`)
- **Directories**: Lowercase with hyphens for multi-word names (e.g., `/FormInputs`, `/TreeExplorer`)

## Component Structure

**Functional Components with Hooks**:
- Use functional components exclusively; avoid class-based components
- Leverage React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) for component logic
- See [EditableTypography.tsx](../../frontend/src/components/EditableTypography.tsx) for a component with hooks and ref management

**Type Safety**:
- Define component props as interfaces with proper `extends` patterns for extending MUI component props
- Example from [EditableTypography.tsx](../../frontend/src/components/EditableTypography.tsx#L17-L22):
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

- Never call API service methods directly; wrap them in custom hooks
- Group related queries in hook files (see [CodeHooks.ts](../../frontend/src/api/CodeHooks.ts), [SdocHooks.ts](../../frontend/src/api/SdocHooks.ts))
- Centralize all query keys in [QueryKey.ts](../../frontend/src/api/QueryKey.ts) enum
- Data Normalization with Record maps (Record<id, data>) for O(1) access

### Redux Toolkit: Use for GLOBAL CLIENT state (dialogs, filters, selections)

- Use typed selector/dispatch hooks: `useAppDispatch()` and `useAppSelector()` from [ReduxHooks.ts](../../frontend/src/plugins/ReduxHooks.ts)
- Create slices for each feature (e.g., annotation, project, search, see [annoSlice.ts](../../frontend/src/views/annotation/annoSlice.ts))

### React Hook Form: Use for FORM STATE (input values, validation state, form submission)

**React Hook Form Integration**:
- Use `useForm()` hook to manage form state and validation
- Wrap form inputs with `Controller` from React Hook Form
- See [FormText.tsx](../../frontend/src/components/FormInputs/FormText.tsx) for input wrapper pattern
- Use [FormInputs components](../../frontend/src/components/FormInputs) for consistent form controls:
  - `FormText`, `FormTextMultiline`, `FormNumber`, `FormPassword`
  - `FormEmail`, `FormDate`, `FormSwitch`, `FormColorPicker`
  - `FormMenu`, `FormFreeSolo`, `FormChipList`

**Validation**:
- Define validation rules in `useForm()` hook via `rules` property in `Controller`
- Display errors with `<ErrorMessage>` component from @hookform/error-message
- Example from [CodeCreateDialog.tsx](../../frontend/src/components/Code/CodeCreateDialog.tsx#L1-L2):
  ```tsx
  import { ErrorMessage } from "@hookform/error-message";
  // In JSX: <ErrorMessage errors={errors} name="fieldName" />
  ```

**Form Reset**:
- Use `useEffect()` to reset form when dialog opens with initial values
- Example from [CodeCreateDialog.tsx](../../frontend/src/components/Code/CodeCreateDialog.tsx#L63-L74)

### React Hooks: `useState()` for LOCAL CLIENT state
- Use for truly local state that doesn't need to be shared (e.g., hover states, temporary UI states)

## Custom Hooks

**Create Custom Hooks for Reusable Logic**:
- Extract component logic into custom hooks when it's used in multiple components
- Examples: [useDialog.ts](../../frontend/src/hooks/useDialog.ts) (dialog state management), [useDebounce.ts](../../frontend/src/utils/useDebounce.ts) (value debouncing)
- File location: `/frontend/src/hooks` for component-generic hooks, `/frontend/src/utils` for utility hooks with type generics

**Hook Design Patterns**:
- Return objects with clear, descriptive names: `{ isOpen, open, close, toggle }`
- Include optional callbacks: `{ onOpen?: () => void; onClose?: () => void }`
- For complex logic with multiple related hooks, create composition (see [useTableInfiniteScroll.ts](../../frontend/src/utils/useTableInfiniteScroll.ts#L44-L92))

## TypeScript & Typing

**Generics for Flexibility**:
- Use generic types for hooks that work with multiple data types
- Example from [useTableInfiniteScroll.ts](../../frontend/src/utils/useTableInfiniteScroll.ts#L2-L7):
  ```tsx
  interface UseTransformInfiniteDataProps<T, U> {
    data: InfiniteData<T> | undefined;
    flatMapData: (page: T) => U[];
    lengthData?: (data: U[]) => number;
  }
  ```

**Generated API Types**:
- API types are auto-generated from OpenAPI spec; use them consistently
- Import models from `frontend/src/api/openapi/models/`
- Type suffixes indicate operation: `Read` (GET), `Create` (POST), `Update` (PUT)

**Avoid `any` Type**:
- Never use `any`; use `unknown` if type is truly unknown, or define proper interface
- Use `Record<>` for maps instead of object literals when type-safe

## Performance Optimization

**Memoization**:
- Use `useMemo()` for expensive computations, derived state, and filtered data lists
- Use `useCallback()` for ALL callback functions passed as props (dependency injection)
- Example from [CodeCreateDialog.tsx](../../frontend/src/components/Code/CodeCreateDialog.tsx#L42-L43):
  ```tsx
  const handleCloseCodeCreateDialog = useCallback(() => {
    dispatch(CRUDDialogActions.closeCodeCreateDialog());
  }, [dispatch]);
  ```

**Dependency Arrays**:
- Be explicit about dependencies; never leave empty with actual dependencies
- Use eslint-plugin-react-hooks to catch missing dependencies

**Data Transformation**:
- Transform API responses to lookup maps (Record) for O(1) access instead of find()
- Cache transformed structures with `useMemo`

**Infinite Scrolling**:
- Use [useTableInfiniteScroll.ts](../../frontend/src/utils/useTableInfiniteScroll.ts) hook for paginated table data
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
- Use [RequireAuth.tsx](../../frontend/src/auth/RequireAuth.tsx) wrapper component for authentication
- Redirects to login page and preserves redirect location for post-login navigation

## Imports
- Use absolute imports from `/` root (configured in vite.config.ts)
- Group imports: React/external libraries → local components → utilities
- Keep imports organized and remove unused imports before committing

## Documentation

- Write JSDoc comments for all public components
- Document props, usage examples, and special behaviors

## Workflow: Creating a Feature with All Patterns

1. **Step 1: Define Query Keys** (QueryKey.ts)
2. **Step 2: Create API Hooks** (e.g., CodeHooks.ts)
3. **Step 3: Create Components** (e.g., CodeTable.tsx, CodeCreateDialog.tsx)
4. **Step 4: Use in Views**

## Tools

### Use the mui-mcp server to answer any MUI questions --

- 1. call the "useMuiDocs" tool to fetch the docs of the package relevant in the question
- 2. call the "fetchDocs" tool to fetch any additional docs if needed using ONLY the URLs present in the returned content.
- 3. repeat steps 1-2 until you have fetched all relevant docs for the given question
- 4. use the fetched content to answer the question
