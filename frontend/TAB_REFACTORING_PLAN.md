Tab Navigation System (User Specification)

Purpose

This document defines how the tab system should work from the user perspective. It intentionally describes behavior, interaction design, and UX expectations only. It does not prescribe technical implementation.

Product Goals

- Tabs should feel like persistent workspaces, not temporary links.
- Users should be able to move between major project areas without losing context.
- Returning to an existing tab should restore the exact view state the user left (filters, query params, selected entity views).
- Tab behavior should be predictable across mouse, keyboard shortcuts, and command interactions.

Current UX Baseline (Observed Behavior)

1. Placement and visibility

- The tab bar is visible in authenticated project views and sits above the main content area.
- It is part of the primary navigation surface together with the sidebar.

2. Tab identity and restoration

- Each tab represents a route identity (for example, a search page, annotation page, specific analysis, or a specific entity such as a document or aspect).
- A tab keeps a full navigable URL state. When users return to that tab, they are brought back to the latest known state of that tab, not a generic default page.
- Direct navigation (for example via links) updates an existing matching tab or creates a new one if none exists.

3. Icon-first recognition

- Tabs include icons to communicate area/type at a glance.
- Icons are mapped to all major route families (search modes, perspectives/map/dashboard, annotation, analysis families, classifier, whiteboard, logbook, tools).
- Icon consistency is important for fast recognition when many tabs are open.

4. Dynamic tab titles

- Generic routes show human-readable area labels.
- Entity routes resolve to entity-aware labels when possible (for example document names, analysis names, aspect names).
- If entity metadata is unavailable, sensible fallback labels are shown (for example, "Document 123").
- Tab text truncates with ellipsis to keep layout stable.

5. Interaction model

- Clicking a tab activates it and navigates to that tab's latest state.
- Each tab has an inline close affordance.
- Tabs can be reordered via drag and drop.
- Closing the active tab selects an adjacent tab (left-first behavior in current UX).

6. Overflow behavior

- Tabs are horizontally scrollable when the list exceeds available width.
- Left/right controls are present to scroll the tab strip.
- Activating a tab auto-scrolls it into view.

7. Keyboard and command affordances

- Users can move to previous/next tab via keyboard shortcuts.
- Users can close the active tab via keyboard shortcut.
- A tab options menu exposes previous/next navigation, close all, close to the right, and command menu access.

8. Bulk open behavior

- Some workflows open multiple tabs at once (for example, opening several documents into annotation tabs).
- Bulk-open should preserve stable ordering and avoid disruptive focus jumps.

9. Project isolation

- Tabs are scoped to the current project context.
- Changing project should not mix or leak tabs between projects.

UX Requirements For The Refactor

1. Core behavior to preserve

- Preserve "resume where I left off" behavior per tab.
- Preserve route-level deduplication (focusing an already open tab instead of creating duplicates for the same route identity).
- Preserve icon + title pairing on every tab.
- Preserve drag reorder, close, close-to-right, and close-all capabilities.

2. Clarity and predictability improvements

- Define and keep consistent what happens when the user closes the last visible tab.
- Define and keep consistent the fallback target when closing the active tab.
- Ensure behavior is identical whether navigation starts from sidebar, in-content links, command menu, or shortcuts.

3. Visual and interaction feel

- Tabs should communicate active vs inactive state clearly.
- Hover, active, and drag states should be visually distinct.
- Close controls should remain discoverable without causing accidental closes.
- Long tab sets should stay manageable without layout jumps.

4. Information architecture expectations

- The following user-facing areas should remain first-class tab destinations with distinct identity and iconography:
- Search: document, image, sentence
- Perspectives: overview, dashboard/aspect detail, map
- Annotation: collection view and specific document view
- Analysis: timeline, concepts over time, word frequency, code frequency, span/sentence/bbox annotation analyses
- Project tools: classifier, whiteboard, logbook, health, ML automation, duplicate finder, document sampler

5. Accessibility and ergonomics

- All tab actions should be keyboard reachable.
- Focus transitions between tabs and content should be intuitive.
- Labels and icons should remain understandable at compact widths.

Acceptance Criteria (User-Centric)

- Users can open, focus, reorder, and close tabs without losing expected page state.
- Re-visiting a tab reliably restores prior context (especially search/filter-heavy pages).
- Users can identify tabs quickly via icon + meaningful label.
- Overflow scenarios remain usable with many open tabs.
- Keyboard-first users can perform common tab operations end to end.
- Multi-project usage feels isolated and predictable.

Tab Navigation System (Technical Specification)
TanStack Router Tab Navigation System: Architectural Documentation

This document serves as the comprehensive guide for our application's tab navigation system. It explains the core concepts, historical design decisions, and the technical implementation of our TanStack Router-based tab management.

1. Background & The Problem

Historically, our application stored view state (like search queries, selected items, pagination) in global Redux stores. This meant tabs were just UI components reflecting a global state.

Recently, we migrated to URL-driven state using TanStack Router's search parameters. This is a massive improvement, giving us shareable URLs and native browser history. However, it fundamentally broke the old tab system:

When a user navigates from the Search Tab (/search?query=react) to a Document Tab (/document/123), the URL changes.

If they click the "Search" tab in the sidebar again (a hardcoded <Link to="/search">), the search parameters are lost, and the search view resets.

The Goal: We need a Tab System that remembers the last known complete URL (pathname + search params) for every open tab, while fully leveraging TanStack Router's type safety and remaining compatible with advanced UI interactions (drag-and-drop, "close others", etc.).

2. Core Design Principles

Before diving into the code, it is critical to understand the architectural rules that govern this system.

Principle 1: Strict One-Way Synchronization (The Router is the Boss)

We strictly avoid two-way synchronization between Redux and the Router.

The Anti-Pattern: Storing an activeTabId in Redux and using a useEffect to force the Router to match Redux. This leads to race conditions, infinite loops, and flickering.

Our Solution: TanStack Router (useLocation().pathname) is the single undisputed source of truth for what is currently active. Redux is merely a passive "history book" that remembers the state of inactive tabs.

Principle 2: Separation of Concerns

Router: Handles physical navigation and active state.

Redux (Tab Store): Handles the lists (tabsById, tabOrder) and the history of href strings.

Hooks (useTabManager): Acts as the "brain." When a complex action happens (like closing a tab), the hook reads the Redux list, calculates the next logical tab, explicitly tells the Router to navigate, and then cleans up Redux.

Principle 3: Project-Scoped Workspaces

Tabs are scoped by projectId. If a user switches from Project A to Project B, they should see a completely different set of tabs. The Redux store is structured to handle this automatically.

Principle 4: Route Co-location

Instead of maintaining a massive external registry of tab titles and icons, we define them directly inside the TanStack Router route definitions using staticData. This keeps configuration exactly where the route is defined and allows us to leverage TanStack Query loaders for dynamic entity titles.

3. System Components & Implementation

The system is broken down into 6 distinct phases.

Phase 0: Strictly Typing staticData

To achieve Route Co-location safely, we augment TanStack Router's internal types. By extending StaticDataRouteOption, we ensure the TypeScript compiler checks our custom tab metadata (icons and titles) in every route file across the app. We use a unified getTitle function that can handle both static strings and dynamic data from loaders.

// src/types/router.d.ts
import '@tanstack/react-router'
import React from 'react'

declare module '@tanstack/react-router' {
interface StaticDataRouteOption {
icon?: React.ElementType;
getTitle?: (loaderData?: any) => string;
}
}

Phase 1: The Tab Store (Redux Toolkit)

This Redux slice manages the state of our tabs.

Critical Architectural Note: Notice the complete absence of activeTabId in this state. This is intentional to enforce Principle 1 (One-Way Sync). This slice only handles adding, removing, and reordering items in the arrays/dictionaries.

// src/store/tabSlice.ts
import { Draft, PayloadAction, createSlice } from "@reduxjs/toolkit";
import React from "react";
import { RootState } from "./store";

export interface TabData {
id: string;
href: string;
label: string;
icon?: React.ElementType;
}

interface ProjectTabState {
tabsById: Record<string, TabData>;
tabOrder: string[];
}

export interface TabState {
tabsByProject: Record<number, ProjectTabState>;
}

const initialState: TabState = {
tabsByProject: {},
};

const createProjectTabState = (): ProjectTabState => ({
tabsById: {},
tabOrder: [],
});

const getOrCreateProjectTabState = (state: Draft<TabState>, projectId: number): ProjectTabState => {
if (!state.tabsByProject[projectId]) {
state.tabsByProject[projectId] = createProjectTabState();
}
return state.tabsByProject[projectId];
};

const getDefaultProjectTabState = (): ProjectTabState => createProjectTabState();

const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
const copy = [...arr];
const [item] = copy.splice(from, 1);
copy.splice(to, 0, item);
return copy;
};

const tabSlice = createSlice({
name: "tabs",
initialState,
reducers: {
addOrUpdateTab: (state, action: PayloadAction<{ projectId: number; tab: TabData }>) => {
const projectState = getOrCreateProjectTabState(state, action.payload.projectId);
const { tab } = action.payload;
const exists = Boolean(projectState.tabsById[tab.id]);

      projectState.tabsById[tab.id] = tab;
      if (!exists) {
        projectState.tabOrder.push(tab.id);
      }
    },
    removeTab: (state, action: PayloadAction<{ projectId: number; tabId: string }>) => {
      const projectState = getOrCreateProjectTabState(state, action.payload.projectId);
      const { tabId } = action.payload;
      if (!projectState.tabsById[tabId]) return;

      delete projectState.tabsById[tabId];
      projectState.tabOrder = projectState.tabOrder.filter((id) => id !== tabId);
    },
    reorderTabs: (state, action: PayloadAction<{ projectId: number; sourceTabId: string; destinationTabId: string }>) => {
      const projectState = getOrCreateProjectTabState(state, action.payload.projectId);
      const sourceIndex = projectState.tabOrder.findIndex((id) => id === action.payload.sourceTabId);
      const destinationIndex = projectState.tabOrder.findIndex((id) => id === action.payload.destinationTabId);
      if (sourceIndex === -1 || destinationIndex === -1 || sourceIndex === destinationIndex) return;

      projectState.tabOrder = moveItem(projectState.tabOrder, sourceIndex, destinationIndex);
    },
    closeAllTabs: (state, action: PayloadAction<{ projectId: number }>) => {
      const projectState = getOrCreateProjectTabState(state, action.payload.projectId);
      projectState.tabsById = {};
      projectState.tabOrder = [];
    },
    closeTabsToRight: (state, action: PayloadAction<{ projectId: number; fromTabId: string }>) => {
      const projectState = getOrCreateProjectTabState(state, action.payload.projectId);
      const fromIndex = projectState.tabOrder.findIndex((id) => id === action.payload.fromTabId);
      if (fromIndex === -1 || fromIndex >= projectState.tabOrder.length - 1) return;

      const idsToRemove = projectState.tabOrder.slice(fromIndex + 1);
      idsToRemove.forEach((id) => {
        delete projectState.tabsById[id];
      });
      projectState.tabOrder = projectState.tabOrder.slice(0, fromIndex + 1);
    },

},
});

export const selectProjectTabState = (projectId: number) => (state: RootState): ProjectTabState => {
return state.tabs.tabsByProject[projectId] ?? getDefaultProjectTabState();
};

export const selectProjectTabs = (projectId: number) => (state: RootState) => {
const projectState = selectProjectTabState(projectId)(state);
return projectState.tabOrder.map((id) => projectState.tabsById[id]).filter(Boolean);
};

export const TabActions = tabSlice.actions;
export const tabReducer = tabSlice.reducer;

Phase 2: Route Co-location

We embed tab configuration directly into the route files. If a route loads data (e.g., fetching a Document entity via TanStack Query), the getTitle function will receive that data to render dynamic tab names like "Document: Q3 Report".

// src/routes/project/$projectId/search.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Icon } from '@utils/icons/iconUtils'

export const Route = createFileRoute('/project/$projectId/search')({
staticData: {
icon: Icon.SEARCH,
getTitle: () => 'Search',
},
// ...
})

Phase 3: The Smart Router Synchronizer

This headless component sits at the root of the app. It is our "passive observer." Every time the URL changes, it grabs the deepest matched route, extracts the static data, evaluates the title, and saves the full href (with search params) into Redux.

// src/components/TabSynchronizer.tsx
import { useEffect } from 'react';
import { useRouterState, useMatches, useParams } from '@tanstack/react-router';
import { useDispatch } from 'react-redux';
import { TabActions } from '../store/tabSlice';
import { Icon } from '@utils/icons/iconUtils';

export function TabSynchronizer() {
const dispatch = useDispatch();
const location = useRouterState({ select: (s) => s.location });

const params = useParams({ strict: false }) as { projectId?: string };
const matches = useMatches();

useEffect(() => {
if (!params.projectId) return;
const projectId = Number(params.projectId);

    const pathname = location.pathname;
    const href = location.href;
    const deepestMatch = matches[matches.length - 1];
    const staticData = deepestMatch?.staticData;
    const loaderData = deepestMatch?.loaderData;

    const icon = staticData?.icon || Icon.DEFAULT;
    let label = pathname;
    if (staticData?.getTitle) {
      label = staticData.getTitle(loaderData);
    }

    dispatch(TabActions.addOrUpdateTab({
      projectId,
      tab: { id: pathname, href, label, icon }
    }));

}, [location.href, matches, params.projectId, dispatch]);

return null;
}

Phase 4: Type-Safe Navigation Wrappers

When a user clicks a <TabLink to="/search"> in the sidebar, we want TanStack Router to type-check the path. However, we intercept the click. We look into Redux, and if the /search tab is already open with a saved historical href (e.g., /search?query=react), we forcefully redirect the click to that saved URL.

// src/components/TabLink.tsx
import React from 'react';
import { Link, LinkProps, useRouter, RegisteredRouter } from '@tanstack/react-router';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

export function TabLink<
TFrom extends string = string,
TTo extends string = '',
TMaskFrom extends string = TFrom,
TMaskTo extends string = ''

> (
> props: LinkProps<RegisteredRouter['routeTree'], TFrom, TTo, TMaskFrom, TMaskTo>
> ) {
> const router = useRouter();
> const tabsByProject = useSelector((state: RootState) => state.tabs.tabsByProject);

const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
const targetLocation = router.buildLocation(props as any);
const targetTabId = targetLocation.pathname;

    const projectIdMatch = targetTabId.match(/\/project\/(\d+)/);
    const projectId = projectIdMatch ? Number(projectIdMatch[1]) : null;

    const existingTab = projectId ? tabsByProject[projectId]?.tabsById[targetTabId] : undefined;

    if (existingTab && !props.search) {
      e.preventDefault();
      router.navigate({ to: existingTab.href });
    }

    if (props.onClick) {
      props.onClick(e);
    }

};

return <Link {...props} onClick={handleClick} />;
}

Phase 4.5: The useTabManager Hook

Because Redux no longer manages the active tab, this hook contains the "business logic" for complex UI interactions.

For example, when closeTab is called:

It checks if the tab being closed is the currently active tab.

If so, it reads the Redux tabOrder array to find the adjacent tab.

It issues a router.navigate() command to physically move the user.

Finally, it dispatches the removeTab action to clean up the Redux history.

// src/hooks/useTabManager.ts
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { TabActions, selectProjectTabState } from '../store/tabSlice';

export function useTabManager(projectId: number) {
const dispatch = useDispatch();
const navigate = useNavigate();
const currentPathname = useRouterState({ select: (s) => s.location.pathname });

// Read the current state of tabs for this project
const { tabsById, tabOrder } = useSelector(selectProjectTabState(projectId));

const closeTab = useCallback((tabIdToRemove: string) => {
// 1. If we are closing the ACTIVE tab, we must navigate to an adjacent tab first
if (currentPathname === tabIdToRemove) {
const currentIndex = tabOrder.indexOf(tabIdToRemove);
let nextTabId: string | null = null;

      if (currentIndex > 0) {
        nextTabId = tabOrder[currentIndex - 1]; // Prefer tab to the left
      } else if (currentIndex < tabOrder.length - 1) {
        nextTabId = tabOrder[currentIndex + 1]; // Fallback to right
      }

      if (nextTabId && tabsById[nextTabId]) {
        navigate({ to: tabsById[nextTabId].href });
      } else {
        // No tabs left! Go to a default fallback route for this project
        navigate({ to: `/project/${projectId}/search` });
      }
    }

    // 2. Safely remove it from Redux (the history)
    dispatch(TabActions.removeTab({ projectId, tabId: tabIdToRemove }));

}, [currentPathname, tabOrder, tabsById, projectId, navigate, dispatch]);

const goToAdjacentTab = useCallback((direction: 'left' | 'right') => {
if (tabOrder.length <= 1) return;

    const currentIndex = tabOrder.indexOf(currentPathname);
    if (currentIndex === -1) return; // Current route isn't a known tab

    let nextIndex;
    if (direction === 'left') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : tabOrder.length - 1;
    } else {
      nextIndex = currentIndex < tabOrder.length - 1 ? currentIndex + 1 : 0;
    }

    const nextTabId = tabOrder[nextIndex];
    if (nextTabId && tabsById[nextTabId]) {
      navigate({ to: tabsById[nextTabId].href });
    }

}, [currentPathname, tabOrder, tabsById, navigate]);

return {
closeTab,
goToPreviousTab: () => goToAdjacentTab('left'),
goToNextTab: () => goToAdjacentTab('right'),
closeAllTabs: () => {
dispatch(TabActions.closeAllTabs({ projectId }));
navigate({ to: `/project/${projectId}/search` });
},
closeTabsToRight: (fromTabId: string) => {
// Only close from Redux history, if active tab is among the closed ones,
// you would navigate to fromTabId.
const fromIndex = tabOrder.indexOf(fromTabId);
const currentIndex = tabOrder.indexOf(currentPathname);

       if (currentIndex > fromIndex) {
          const safeTab = tabsById[fromTabId];
          if (safeTab) navigate({ to: safeTab.href });
       }
       dispatch(TabActions.closeTabsToRight({ projectId, fromTabId }));
    }

};
}

Phase 5: The Drag-and-Drop Tab Bar UI

The visual component that maps over the tabs from Redux. It identifies the "active" tab strictly by comparing the tab's ID to location.pathname. All user actions (closing, moving) are delegated either to the useTabManager or directly dispatched to the passive Redux store (for visual reordering).

// src/components/TabBar.tsx
import { useRouterState, useNavigate, useParams } from '@tanstack/react-router';
import { useSelector, useDispatch } from 'react-redux';
import { TabActions, selectProjectTabs } from '../store/tabSlice';
import { useTabManager } from '../hooks/useTabManager';
import { Icon } from '@utils/icons/iconUtils';

// Note: Wrap this component's render in DndContext/SortableContext to implement drag events.

export function TabBar() {
const dispatch = useDispatch();
const navigate = useNavigate();
const location = useRouterState({ select: (s) => s.location });

const params = useParams({ strict: false }) as { projectId?: string };
const projectId = params.projectId ? Number(params.projectId) : null;

// Use our new hook!
const tabManager = useTabManager(projectId || 0);
const tabs = useSelector(selectProjectTabs(projectId || 0));

const handleDragEnd = (event: any) => {
const { active, over } = event;
if (active.id !== over.id && projectId) {
dispatch(TabActions.reorderTabs({
projectId,
sourceTabId: active.id as string,
destinationTabId: over.id as string,
}));
}
};

if (!projectId || tabs.length === 0) return null;

return (
<div className="flex border-b overflow-x-auto bg-white">
{/_ Example Keyboard Shortcuts / Actions (To demonstrate the hook) _/}
{/_ <button onClick={tabManager.goToPreviousTab}>Prev Tab</button>
<button onClick={tabManager.goToNextTab}>Next Tab</button>
_/}

      {tabs.map((tab) => {
        // TanStack Router defines what is active!
        const isActive = location.pathname === tab.id;
        const TabIcon = tab.icon || Icon.DEFAULT;

        return (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 border-r cursor-pointer transition-colors ${
              isActive ? 'bg-blue-50 text-blue-700 font-medium border-b-2 border-b-blue-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => navigate({ to: tab.href })}
          >
            <TabIcon size={16} className={isActive ? 'text-blue-600' : 'text-gray-500'} />
            <span className="whitespace-nowrap text-sm">{tab.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                tabManager.closeTab(tab.id); // Call the hook!
              }}
              className={`rounded-full p-1 ml-1 ${isActive ? 'hover:bg-blue-100' : 'hover:bg-gray-200'}`}
            >
              <span className="text-xs">&times;</span>
            </button>
          </div>
        );
      })}
    </div>

);
}
