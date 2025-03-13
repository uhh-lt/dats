import { Draft, PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "../../components/Project/projectSlice.ts";
import { TabData } from "./types";

export interface TabState {
  tabs: TabData[];
  activeTabIndex: number | null;
}

const initialState: TabState = {
  tabs: [],
  activeTabIndex: null,
};

const resetTabState = (state: Draft<TabState>) => {
  state.tabs = initialState.tabs;
  state.activeTabIndex = initialState.activeTabIndex;
};

export const tabSlice = createSlice({
  name: "tabs",
  initialState,
  reducers: {
    setTabs: (state, action: PayloadAction<TabData[]>) => {
      state.tabs = action.payload;
    },
    addTab: (state, action: PayloadAction<TabData>) => {
      const existingTabIndex = state.tabs.findIndex((tab) => tab.path === action.payload.path);
      if (existingTabIndex === -1) {
        state.tabs.push(action.payload);
        state.activeTabIndex = state.tabs.length - 1;
      } else {
        state.activeTabIndex = existingTabIndex;
      }
    },
    removeTab: (state, action: PayloadAction<number>) => {
      if (state.tabs.length <= 1) return;

      state.tabs.splice(action.payload, 1);

      if (state.activeTabIndex === action.payload) {
        state.activeTabIndex = action.payload > 0 ? action.payload - 1 : 0;
      } else if (state.activeTabIndex !== null && action.payload < state.activeTabIndex) {
        state.activeTabIndex -= 1;
      }
    },
    setActiveTab: (state, action: PayloadAction<number>) => {
      state.activeTabIndex = action.payload;
    },
    reorderTabs: (state, action: PayloadAction<{ sourceIndex: number; destinationIndex: number }>) => {
      const { sourceIndex, destinationIndex } = action.payload;
      const [movedTab] = state.tabs.splice(sourceIndex, 1);
      state.tabs.splice(destinationIndex, 0, movedTab);

      if (state.activeTabIndex === sourceIndex) {
        state.activeTabIndex = destinationIndex;
      } else if (state.activeTabIndex !== null) {
        if (sourceIndex < state.activeTabIndex && destinationIndex >= state.activeTabIndex) {
          state.activeTabIndex -= 1;
        } else if (sourceIndex > state.activeTabIndex && destinationIndex <= state.activeTabIndex) {
          state.activeTabIndex += 1;
        }
      }
    },
    goToLeftTab: (state) => {
      if (state.activeTabIndex === null || state.tabs.length <= 1) return;
      state.activeTabIndex = state.activeTabIndex > 0 ? state.activeTabIndex - 1 : state.tabs.length - 1;
    },
    goToRightTab: (state) => {
      if (state.activeTabIndex === null || state.tabs.length <= 1) return;
      state.activeTabIndex = state.activeTabIndex < state.tabs.length - 1 ? state.activeTabIndex + 1 : 0;
    },
    closeActiveTab: (state) => {
      if (state.activeTabIndex === null || state.tabs.length <= 1) return;
      state.tabs.splice(state.activeTabIndex, 1);
      state.activeTabIndex = state.activeTabIndex > 0 ? state.activeTabIndex - 1 : 0;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'tab' state.");
      resetTabState(state);
    });
  },
});

export const TabActions = tabSlice.actions;
export default tabSlice.reducer;
