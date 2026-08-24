# Workspace System

A generic, entity-agnostic workspace for browsing, searching, filtering, sorting,
grouping, and laying out any entity that DATS can search (memos, span annotations,
sentence annotations, bbox annotations, ...).

One `EntityWorkspace` component gives you saved views (chips), a toolbar with
layout/filter/sort/group/search, and grouped or flat results — all driven by a
single entity-specific **config**. The workspace itself contains no entity logic.

## What it does

- **Saved views** — each user can save multiple named views per entity. Views are
  shown as draggable chips and persisted on the server (per project + entity).
- **Toolbar** — layout switcher, filter dialog, sort menu, group menu, and a
  search toggle. All controls operate on the active view and auto-save (optimistic updates).
- **Results** — rows are fetched with infinite pagination and rendered in the
  active layout. When a view is grouped, results render as a column of groups (or
  a row of columns for the BOARD layout).
- **Layouts** — TABLE, LIST, GALLERY, FEED, and BOARD. BOARD is a grouped layout:
  each group becomes a column.

## What it's built on

- **TanStack Query** — all server state (views, rows, groups, search info) lives in
  query hooks supplied by the config. The workspace never calls API services directly.
- **TanStack Router** — navigation (e.g. opening a detail view) is the _feature's_
  concern, wired through the `onSelect` callback. The workspace never navigates.
- **MUI** — toolbar, menus, chips, dialogs, and layout primitives.
- **dnd-kit** — drag-to-reorder for the view chips.
- **Redux Toolkit** — the _feature_ owns preference persistence (e.g. last-active
  view, recents). The workspace exposes `lastViewId` / `onRememberView` and stays
  agnostic about where they're stored.

## The config: `EntityWorkspaceConfig<TColumns, TRow>`

Everything entity-specific is supplied through one config object. The two generics
are the entity's column enum (`TColumns`) and its row type (`TRow`).

```ts
interface EntityWorkspaceConfig<TColumns extends string, TRow extends { id: number }> {
  entityType: SearchEntityType;
  entityLabel: string;                    // "memo" — used in empty states / placeholders
  columns: Record<TColumns, TColumns>;    // the column enum, for sort/group menus
  columnIcons: Record<TColumns, ReactNode>;
  defaultFilterExpression: MyFilterExpression<TColumns>;
  dateColumns: TColumns[];                // columns that get a date-granularity selector
  emptyFilter: () => MyFilter<TColumns>;  // filter factory for a brand-new view

  // data hooks
  useSearchInfo: ...;   // column metadata for the filter dialog
  useQueryRows: ...;    // paged rows for a view
  useQueryGroups: ...;  // paged groups for a grouped view
  useSearchViews: ...;  // CRUD + reorder for saved views

  // per-layout renderers
  tableHeader: ReactNode;
  renderTableRow: (row, onSelect) => ReactNode;
  renderListItem: (row, onSelect) => ReactNode;
  renderCard: (row, onSelect) => ReactNode;
  renderFeedItem: (row, onSelect) => ReactNode;

  templates: WorkspaceTemplate<TColumns>[];  // entries in the "new view" menu
  renderGroupAction?: (group, onSelect) => ReactNode;  // optional per-group action
}
```

The config is the **only** coupling between the generic workspace and a concrete
entity. See
[memoWorkspaceConfig.tsx](../../features/memo-workspace/views/main/_components/memoWorkspaceConfig.tsx)
for a complete example.

## Building an entity workspace

1. **Define the config.** Create a `create<Entity>WorkspaceConfig(...)` factory
   returning an `EntityWorkspaceConfig`. Wire the data hooks to the entity's
   generated API hooks, provide the per-layout renderers, and declare the
   create-view templates.

2. **Render `EntityWorkspace` from a feature component.** Pass `projectId`, the
   config, and the three interaction props:

   ```tsx
   <EntityWorkspace
     projectId={projectId}
     config={config}
     onSelect={handleSelect} // feature decides what "open" means
     lastViewId={preferences?.lastViewId} // feature-owned persistence
     onRememberView={handleRememberView}
   />
   ```

3. **Own the surrounding concerns in the feature.** `EntityWorkspace` is only
   toolbar + results + empty state. The feature owns:
   - **Navigation / detail views** — via `onSelect` (typically a router navigation).
   - **Page layout** — sidebars, split panes, etc. wrap `EntityWorkspace` in the
     feature's view component (e.g. `SidebarContentLayout`).
   - **Preference persistence** — a feature slice stores `lastViewId` / recents.

## Design principles

These are deliberate; please keep them when extending the system.

- **Entity-agnostic core.** `EntityWorkspace` and everything under `_components/`
  and `_hooks/` contain no entity-specific code. All entity knowledge enters via
  the config.
- **One exported component per file.** No multi-export files.
- **Self-contained triggers.** A button owns its menu/dialog (e.g.
  `SortMenuButton`, `CreateViewMenuButton`). No separate "button" + "menu" files.
- **Folder pattern.** Each area (`toolbar/`, `results/`, `result-layout/`) has one
  public component at its root; internals live in a nested `_components/` folder.
- **Feature owns the frame.** Routing, detail views, sidebars, and page layout are
  feature concerns — never the core workspace's.
- **Duplicate tiny code rather than abstract.** A few repeated lines are cheaper
  than a shared abstraction with extra exports.

## Layout

```
core/workspace/
  EntityWorkspace.tsx          # public entry: toolbar + results + empty state
  index.ts                     # public exports (component + config/view types)
  types/
    EntityWorkspaceConfig.ts   # the config contract
    WorkspaceGeneratedTypes.ts # generic mirrors of the generated OpenAPI types
  _hooks/
    useWorkspaceViews.ts       # view CRUD, selection, reorder, optimistic updates
  _components/
    toolbar/
      WorkspaceToolbar.tsx     # public toolbar
      _components/             # SortableViewChips, CreateViewMenuButton, ...
    results/
      WorkspaceResults.tsx     # public router: grouped vs flat
      _components/             # GroupedResults, EntityGroup, EntityResultList
    result-layout/
      WorkspaceResultLayout.tsx# public: picks the layout for the rows
      _components/             # TableLayout, ListLayout, GalleryLayout, FeedLayout
```

### A note on `WorkspaceGeneratedTypes.ts`

The backend emits one concrete type per entity (`QueryRequest_MemoColumns_`,
`MemoSearchViewRead`, ...). The generic interfaces in
[WorkspaceGeneratedTypes.ts](types/WorkspaceGeneratedTypes.ts) mirror their shared
shape so the workspace can stay generic. They are **hand-written mirrors**, not
derived types — `AssertEqual` checks at the bottom of the file turn any drift
(after regenerating the API client) into a compile error. If the build breaks
there, update the mirror to match the regenerated types.
