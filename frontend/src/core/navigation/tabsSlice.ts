import { AuthActions } from "@core/auth";
import { Draft, PayloadAction, createSelector, createSlice } from "@reduxjs/toolkit";
import { RootState } from "@store/store";
import { persistReducer } from "redux-persist";
import { persistStorage } from "@store/persistStorage";
import { ProjectTabState, TabData } from "./_types/TabData";
import { normalizeTabRoute } from "./_utils/TabRouteTargetUtils";

export interface TabsState {
  userId?: number;
  tabsByProject: Record<number, ProjectTabState>;
}

const createProjectTabState = (): ProjectTabState => ({
  tabsById: {},
  tabOrder: [],
});

const getOrCreateProjectTabState = (state: Draft<TabsState>, projectId: number): ProjectTabState => {
  if (!state.tabsByProject[projectId]) {
    state.tabsByProject[projectId] = createProjectTabState();
  }
  return state.tabsByProject[projectId];
};

const moveItem = <T>(arr: T[], from: number, to: number): T[] => {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

const initialState: TabsState = {
  userId: undefined,
  tabsByProject: {},
};

const EMPTY_PROJECT_TAB_STATE: ProjectTabState = {
  tabsById: {},
  tabOrder: [],
};

const normalizeTabData = (tabInput: TabData): TabData => {
  const route = normalizeTabRoute(tabInput.route);

  return {
    ...tabInput,
    route,
  };
};

const tabsSlice = createSlice({
  name: "tabs",
  initialState,
  reducers: {
    addOrUpdateTab: (state, action: PayloadAction<{ projectId: number; tab: TabData }>) => {
      const projectState = getOrCreateProjectTabState(state, action.payload.projectId);
      const tab = normalizeTabData(action.payload.tab);
      const exists = Boolean(projectState.tabsById[tab.id]);

      projectState.tabsById[tab.id] = tab;
      if (!exists) {
        projectState.tabOrder.push(tab.id);
      }
    },
    addOrUpdateTabs: (state, action: PayloadAction<{ projectId: number; tabs: TabData[] }>) => {
      const projectState = getOrCreateProjectTabState(state, action.payload.projectId);
      action.payload.tabs.forEach((tabInput) => {
        const tab = normalizeTabData(tabInput);
        const exists = Boolean(projectState.tabsById[tab.id]);
        projectState.tabsById[tab.id] = tab;
        if (!exists) {
          projectState.tabOrder.push(tab.id);
        }
      });
    },
    removeTab: (state, action: PayloadAction<{ projectId: number; tabId: string }>) => {
      const projectState = getOrCreateProjectTabState(state, action.payload.projectId);
      const { tabId } = action.payload;
      if (!projectState.tabsById[tabId]) return;

      delete projectState.tabsById[tabId];
      projectState.tabOrder = projectState.tabOrder.filter((id) => id !== tabId);
    },
    reorderTabs: (
      state,
      action: PayloadAction<{ projectId: number; sourceTabId: string; destinationTabId: string }>,
    ) => {
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
  extraReducers: (builder) => {
    builder.addCase(AuthActions.userChanged, (state, action) => {
      if (state.userId === action.payload) {
        return;
      }

      state.userId = action.payload;
      state.tabsByProject = {};
    });
  },
});

export const TabsActions = tabsSlice.actions;

export const selectProjectTabState = (state: RootState, projectId: number): ProjectTabState =>
  state.tabs.tabsByProject[projectId] ?? EMPTY_PROJECT_TAB_STATE;

export const selectProjectTabs = createSelector([selectProjectTabState], (projectState): TabData[] =>
  projectState.tabOrder.map((id) => projectState.tabsById[id]).filter((tab): tab is TabData => Boolean(tab)),
);

export const tabsReducer = {
  [tabsSlice.name]: persistReducer(
    {
      key: tabsSlice.name,
      storage: persistStorage,
    },
    tabsSlice.reducer,
  ),
};
