---
applyTo: "frontend/**/*.ts, frontend/**/*.tsx"
---

# Frontend

The frontend is built using Typescript with React as the web framework.
It interacts with the backend through RESTful API endpoints.
It follows a component-based architecture, organizing UI elements into reusable components.

## Libraries and Frameworks

Dependencies are listed in package.json and managed with npm.

- React for building user interfaces
- React Router for client-side routing
- Tanstack Query for data fetching and server state management
- Redux Toolkit for global state management
- React Hook Form for form state management
- React MUI for UI components, styling, theming, and icons

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

**Clear Separation of Concerns**:
- **Tanstack Query**: Use for ALL server state (data from API, loading, errors)
- **Redux Toolkit**: Use ONLY for UI state (dialogs, filters, selections, navigation state)
- Never duplicate server state in Redux; let Tanstack Query be the source of truth

**Redux Usage**:
- Store UI-related state like dialog open/close states, table filters, selected items
- See [annoSlice.ts](../../frontend/src/views/annotation/annoSlice.ts) for typical Redux patterns
- Use typed selector/dispatch hooks: `useAppDispatch()` and `useAppSelector()` from [ReduxHooks.ts](../../frontend/src/plugins/ReduxHooks.ts)

**Dialog State Management**:
- Open/close state in Redux (e.g., `isCodeCreateDialogOpen`)
- Dialog content metadata in Redux (e.g., `codeName`, `parentCodeId`)
- Success callbacks stored in Redux for access from deeply nested components

## Data Fetching & API Integration

**All API Calls via Hooks**:
- Never call API service methods directly; wrap them in custom hooks
- Group related queries in hook files (see [CodeHooks.ts](../../frontend/src/api/CodeHooks.ts), [SdocHooks.ts](../../frontend/src/api/SdocHooks.ts))
- Return multiple hooks as a named export object:
  ```tsx
  const CodeHooks = {
    useGetEnabledCodes,
    useCreateCode,
    useUpdateCode,
    useDeleteCode,
  };
  export default CodeHooks;
  ```

**Query Key Management**:
- Centralize all query keys in [QueryKey.ts](../../frontend/src/api/QueryKey.ts) enum
- Use consistent naming: `RESOURCE_ID`, `RESOURCE_LIST`, `RESOURCE_DETAIL`
- Enables consistent cache invalidation across the application

**Tanstack Query Configuration**:
- Set `staleTime` appropriately (e.g., `Infinity` for static data, specific durations for dynamic)
- Use `select` parameter to transform data and prevent unnecessary re-renders:
  ```tsx
  useQuery({
    queryKey: [QueryKey.CODES],
    queryFn: () => CodeService.list(),
    select: (data) => data.reduce((map, code) => ({ ...map, [code.id]: code }), {}),
  })
  ```
- Use `refetchOnWindowFocus`, `refetchOnRemount` strategically based on data freshness needs

**Handling Loading and Error States**:
- Tanstack Query automatically provides `isLoading`, `isError`, `data`, `error` states
- Use `isPending` for mutations to control button loading states
- Check [CodeCreateDialog.tsx](../../frontend/src/components/Code/CodeCreateDialog.tsx#L84-L85) for mutation error handling

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

## Form Handling

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

## Code Organization

**Component Organization**:
- Components grouped by feature in `/components` (Code, Memo, SourceDocument, etc.)
- Each feature folder contains all related sub-components and styles
- See `/components/Code` directory structure with `CodeCreateDialog.tsx`, `CodeTable.tsx`, etc.

**View Organization**:
- Page-level components in `/views` organized by feature (annotation, search, analysis, etc.)
- Each view folder is a self-contained feature with its Redux slice, sub-views, and sub-components

**Imports**:
- Use absolute imports from `/` root (configured in vite.config.ts)
- Group imports: React/external libraries → local components → utilities
- Keep imports organized and remove unused imports before committing

## Documentation

**Component Documentation**:
- Write JSDoc comments for all public components
- Document props, usage examples, and special behaviors
- Example:
  ```tsx
  /**
   * Editable typography component that toggles between display and edit mode.
   * @param value Current text value
   * @param onChange Callback when text is edited and confirmed
   * @param whiteColor Whether to apply white styling
   */
  function EditableTypography({ value, onChange, whiteColor }: Props) { ... }
  ```

**Hook Documentation**:
- Document hook parameters and return value structure
- Example from [useDialog.ts](../../frontend/src/hooks/useDialog.ts) return object shows clear naming

## Key Differences from Standard React/TypeScript

| Aspect | This Project |
|--------|---|---|
| Global State | Redux |
| Server State | Tanstack Query exclusively |
| Form State | React Hook Form only |
| Error Handling | Per-component try/catch, Global mutation cache handler |
| Component Props | Strict typing with interfaces |
| Component Memoization | Common with memo() |
| Data Normalization | Record maps (Record<id, data>) |
| Query Keys | Centralized QueryKey enum |
| Success Messages | Manual snackbars | Mutation meta property |

## Notable Architectural Decisions

1. **Separation of Concerns**: Server state (Tanstack Query) strictly separated from client state (Redux)
2. **Declarative Quality State**: No manual loading/error state management
3. **Centralized Error Handling**: Single mutation cache error handler for all mutations
4. **Query Caching Strategy**: Aggressive caching with smart stale times
5. **Type Safety**: Full TypeScript with generated API types
6. **Component Composition**: Small, focused components with clear responsibilities
7. **Redux for UI Only**: Redux not used for data, only for UI state
8. **Custom Hook Abstraction**: All API calls wrapped in hooks (no direct Service usage in components)

## Creating a Feature with All Patterns

1. **Step 1: Define Query Keys** (QueryKey.ts)
2. **Step 2: Create API Hooks** (e.g., CodeHooks.ts)
3. **Step 3: Create Components** (e.g., CodeTable.tsx, CodeCreateDialog.tsx)
4. **Step 4: Use in Views**
