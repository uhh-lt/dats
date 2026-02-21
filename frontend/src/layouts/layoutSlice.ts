import { createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

export enum LayoutPercentageKeys {
  // percentages
  ContentContentLayout = "content-content-layout",
  SearchVerticalSidebar = "search-vertical-sidebar",
  TimelineSidebar = "timeline-sidebar",
  TimelineContent = "timeline-main-content",
  CotaSidebar = "cota-sidebar",
  CotaContent = "cota-main-content",
  DocumentSamplerSidebar = "document-sampler-sidebar",
  DocumentSamplerContent = "document-sampler-content",
}

export enum LayoutSizeKeys {
  SidebarContentLayoutLeft = "sidebar-content-layout-left",
  SidebarContentSidebarLayoutLeft = "sidebar-content-sidebar-layout-left",
  SidebarContentSidebarLayoutRight = "sidebar-content-sidebar-layout-right",
}

export interface LayoutState {
  // Stores percentage values (0-100) for resizable components
  verticalPercentages: Record<LayoutPercentageKeys, number>;
  // Stores pixel values for resizable components
  sizes: Record<LayoutSizeKeys, number>;
}

const initialState: LayoutState = {
  verticalPercentages: {
    [LayoutPercentageKeys.SearchVerticalSidebar]: 30,
    [LayoutPercentageKeys.TimelineSidebar]: 30,
    [LayoutPercentageKeys.TimelineContent]: 30,
    [LayoutPercentageKeys.ContentContentLayout]: 30,
    [LayoutPercentageKeys.CotaSidebar]: 30,
    [LayoutPercentageKeys.CotaContent]: 30,
    [LayoutPercentageKeys.DocumentSamplerSidebar]: 30,
    [LayoutPercentageKeys.DocumentSamplerContent]: 30,
  },
  sizes: {
    [LayoutSizeKeys.SidebarContentLayoutLeft]: 300,
    [LayoutSizeKeys.SidebarContentSidebarLayoutLeft]: 300,
    [LayoutSizeKeys.SidebarContentSidebarLayoutRight]: 300,
  },
};

export const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    setPercentage: (state, action: { payload: { componentName: LayoutPercentageKeys; percentage: number } }) => {
      // round the percentage to prevent floating point errors
      const roundedPercentage = Math.round(action.payload.percentage);

      // only update the state if the percentage has changed
      if (roundedPercentage !== state.verticalPercentages[action.payload.componentName]) {
        state.verticalPercentages[action.payload.componentName] = roundedPercentage;
      }
    },
    setSize: (state, action: { payload: { componentName: LayoutSizeKeys; size: number } }) => {
      // round the size to prevent floating point errors
      const roundedSize = Math.round(action.payload.size);

      // only update the state if the size has changed
      if (roundedSize !== state.sizes[action.payload.componentName]) {
        state.sizes[action.payload.componentName] = roundedSize;
      }
    },
  },
});

export const LayoutActions = layoutSlice.actions;
export const layoutReducer = persistReducer(
  {
    key: "layout",
    storage,
  },
  layoutSlice.reducer,
);
