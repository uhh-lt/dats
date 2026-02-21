import { Draft, PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "../../core/project/projectSlice.ts";
import { RootState } from "../../store/store.ts";
import { TabData } from "./types/TabData.ts";

export interface TabState {
  tabsByProject: Record<
    number,
    {
      tabs: TabData[];
      activeTabIndex: number | null;
    }
  >;
}

const initialState: TabState = {
  tabsByProject: {},
};

const getOrCreateTabState = (state: Draft<TabState>, projectId: number) => {
  if (!state.tabsByProject[projectId]) {
    state.tabsByProject[projectId] = {
      tabs: [],
      activeTabIndex: null,
    };
  }
  return state.tabsByProject[projectId];
};

const resetTabState = (state: Draft<TabState>, projectId: number) => {
  if (!state.tabsByProject[projectId]) {
    state.tabsByProject[projectId] = {
      tabs: [],
      activeTabIndex: null,
    };
  }
};

export const tabSlice = createSlice({
  name: "tabs",
  initialState,
  reducers: {
    addTab: (state, action: PayloadAction<{ tabData: TabData; projectId: number }>) => {
      const projectState = getOrCreateTabState(state, action.payload.projectId);
      const existingTabIndex = projectState.tabs.findIndex((tab) => tab.path === action.payload.tabData.path);
      if (existingTabIndex === -1) {
        projectState.tabs.push(action.payload.tabData);
        projectState.activeTabIndex = projectState.tabs.length - 1;
      } else {
        projectState.activeTabIndex = existingTabIndex;
      }
    },
    addMultipleTabs: (state, action: PayloadAction<{ tabDatas: TabData[]; projectId: number }>) => {
      const projectState = getOrCreateTabState(state, action.payload.projectId);
      action.payload.tabDatas.forEach((tabData) => {
        const existingTabIndex = projectState.tabs.findIndex((tab) => tab.path === tabData.path);
        if (existingTabIndex === -1) {
          projectState.tabs.push(tabData);
        }
      });
    },
    removeTab: (state, action: PayloadAction<{ tabId: number; projectId: number }>) => {
      const projectState = getOrCreateTabState(state, action.payload.projectId);
      if (projectState.tabs.length <= 1) return;

      projectState.tabs.splice(action.payload.tabId, 1);

      if (projectState.activeTabIndex === action.payload.tabId) {
        projectState.activeTabIndex = action.payload.tabId > 0 ? action.payload.tabId - 1 : 0;
      } else if (projectState.activeTabIndex !== null && action.payload.tabId < projectState.activeTabIndex) {
        projectState.activeTabIndex -= 1;
      }
    },
    setActiveTab: (state, action: PayloadAction<{ tabId: number; projectId: number }>) => {
      const projectState = getOrCreateTabState(state, action.payload.projectId);
      projectState.activeTabIndex = action.payload.tabId;
    },
    reorderTabs: (
      state,
      action: PayloadAction<{ sourceIndex: number; destinationIndex: number; projectId: number }>,
    ) => {
      const projectState = getOrCreateTabState(state, action.payload.projectId);
      const { sourceIndex, destinationIndex } = action.payload;
      const [movedTab] = projectState.tabs.splice(sourceIndex, 1);
      projectState.tabs.splice(destinationIndex, 0, movedTab);

      if (projectState.activeTabIndex === sourceIndex) {
        projectState.activeTabIndex = destinationIndex;
      } else if (projectState.activeTabIndex !== null) {
        if (sourceIndex < projectState.activeTabIndex && destinationIndex >= projectState.activeTabIndex) {
          projectState.activeTabIndex -= 1;
        } else if (sourceIndex > projectState.activeTabIndex && destinationIndex <= projectState.activeTabIndex) {
          projectState.activeTabIndex += 1;
        }
      }
    },
    goToLeftTab: (state, action: PayloadAction<{ projectId: number }>) => {
      const projectState = getOrCreateTabState(state, action.payload.projectId);
      if (projectState.activeTabIndex === null || projectState.tabs.length <= 1) return;
      projectState.activeTabIndex =
        projectState.activeTabIndex > 0 ? projectState.activeTabIndex - 1 : projectState.tabs.length - 1;
    },
    goToRightTab: (state, action: PayloadAction<{ projectId: number }>) => {
      const projectState = getOrCreateTabState(state, action.payload.projectId);
      if (projectState.activeTabIndex === null || projectState.tabs.length <= 1) return;
      projectState.activeTabIndex =
        projectState.activeTabIndex < projectState.tabs.length - 1 ? projectState.activeTabIndex + 1 : 0;
    },
    closeActiveTab: (state, action: PayloadAction<{ projectId: number }>) => {
      const projectState = getOrCreateTabState(state, action.payload.projectId);
      if (projectState.activeTabIndex === null || projectState.tabs.length <= 1) return;
      projectState.tabs.splice(projectState.activeTabIndex, 1);
      projectState.activeTabIndex = projectState.activeTabIndex > 0 ? projectState.activeTabIndex - 1 : 0;
    },
    closeAllTabs: (state, action: PayloadAction<{ projectId: number }>) => {
      const projectState = getOrCreateTabState(state, action.payload.projectId);
      projectState.tabs = [];
      projectState.activeTabIndex = null;
    },
    closeTabsToRight: (state, action: PayloadAction<{ projectId: number; fromIndex: number }>) => {
      const projectState = getOrCreateTabState(state, action.payload.projectId);
      if (action.payload.fromIndex >= projectState.tabs.length - 1) return;
      projectState.tabs.splice(action.payload.fromIndex + 1);
      if (projectState.activeTabIndex !== null && projectState.activeTabIndex > action.payload.fromIndex) {
        projectState.activeTabIndex = action.payload.fromIndex;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'tab' state.");
      if (action.payload) {
        resetTabState(state, action.payload);
      }
    });
  },
});

export const selectProjectTabs = (projectId: number) => (state: RootState) => {
  if (!state.tabs.tabsByProject[projectId]) {
    return {
      tabs: [],
      activeTabIndex: null,
    };
  }
  return state.tabs.tabsByProject[projectId];
};

export const TabActions = tabSlice.actions;
export const tabReducer = tabSlice.reducer;
