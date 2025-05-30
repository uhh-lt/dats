import { createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
import * as d3 from "d3";
import { v4 as uuidv4 } from "uuid";
import { SdocColumns } from "../../api/openapi/models/SdocColumns.ts";
import { StringOperator } from "../../api/openapi/models/StringOperator.ts";
import {
  createInitialFilterState,
  filterReducer,
  FilterState,
  resetProjectFilterState,
} from "../../components/FilterDialog/filterSlice.ts";
import { MyFilterExpression } from "../../components/FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../components/Project/projectSlice.ts";

export interface AtlasState {
  lastMapId: number | undefined;
  selectedSdocIds: number[];
  selectedSdocIdsIndex: number;
  // view settings
  colorBy: string;
  colorSchemeName: string;
  colorScheme: string[];
  pointSize: number;
  showLabels: boolean;
  // position settings
  xAxis: string;
  yAxis: string;
  showTicks: boolean;
  showGrid: boolean;
  // highlighting
  highlightedTopicId: number | undefined;
  highlightReviewedDocs: boolean;
}

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: SdocColumns.SD_SOURCE_DOCUMENT_FILENAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState: AtlasState & FilterState = {
  ...createInitialFilterState(defaultFilterExpression),
  lastMapId: undefined,
  selectedSdocIds: [],
  selectedSdocIdsIndex: 0,
  // view settings
  colorBy: "topic-broad",
  colorSchemeName: "category",
  colorScheme: d3.schemeCategory10 as string[],
  pointSize: 10,
  showLabels: true,
  // position settings
  xAxis: "Topic Dimension 1",
  yAxis: "Topic Dimension 2",
  showTicks: false,
  showGrid: true,
  // highlighting
  highlightedTopicId: undefined,
  highlightReviewedDocs: false,
};

const resetAtlasState = (state: Draft<AtlasState>) => {
  state.lastMapId = initialState.lastMapId;
  state.highlightedTopicId = initialState.highlightedTopicId;
  state.selectedSdocIds = initialState.selectedSdocIds;
};

export const atlasSlice = createSlice({
  name: "atlas",
  initialState,
  reducers: {
    ...filterReducer,
    // selection
    onSelectionChange: (state, action: PayloadAction<number[]>) => {
      state.selectedSdocIds = action.payload.slice();
    },
    // navigate through the selection
    onSelectionIndexChange: (state, action: PayloadAction<number>) => {
      state.selectedSdocIdsIndex = action.payload;
    },
    onScatterPlotDotClick: (state, action: PayloadAction<number>) => {
      const index = state.selectedSdocIds.indexOf(action.payload);
      if (index !== -1) {
        // If the ID is already selected, remove it from the selection
        state.selectedSdocIds.splice(index, 1);
      } else {
        // If the ID is not selected, add it to the selection
        state.selectedSdocIds.push(action.payload);
      }
    },
    onOpenMap: (state, action: PayloadAction<{ projectId: number; atlasId: number }>) => {
      if (state.lastMapId !== action.payload.atlasId) {
        console.log("Atlas changed! Resetting 'atlas' state.");
        resetAtlasState(state);
        resetProjectFilterState({
          state,
          defaultFilterExpression,
          projectId: action.payload.projectId,
          sliceName: "atlas",
        });
        state.lastMapId = action.payload.atlasId;
      }
    },
    // View settings
    onChangeColorBy: (state, action: PayloadAction<string>) => {
      state.colorBy = action.payload;
    },
    onChangeColorScheme: (state, action: PayloadAction<{ colorSchemeName: string; colorScheme: string[] }>) => {
      state.colorSchemeName = action.payload.colorSchemeName;
      state.colorScheme = action.payload.colorScheme;
    },
    onChangePointSize: (state, action: PayloadAction<number>) => {
      state.pointSize = action.payload;
    },
    onChangeShowLabels: (state, action: PayloadAction<boolean>) => {
      state.showLabels = action.payload;
    },
    // Position settings
    onChangeXAxis: (state, action: PayloadAction<string>) => {
      state.xAxis = action.payload;
    },
    onChangeYAxis: (state, action: PayloadAction<string>) => {
      state.yAxis = action.payload;
    },
    onChangeShowTicks: (state, action: PayloadAction<boolean>) => {
      state.showTicks = action.payload;
    },
    onChangeShowGrid: (state, action: PayloadAction<boolean>) => {
      state.showGrid = action.payload;
    },
    // Highlighting
    onSelectTopic: (state, action: PayloadAction<number>) => {
      if (state.highlightedTopicId === action.payload) {
        state.highlightedTopicId = undefined;
        return;
      }
      state.highlightedTopicId = action.payload;
      // only one highlight at a time
      if (state.highlightedTopicId) {
        state.highlightReviewedDocs = false;
      }
    },
    onChangeHighlightReviewedDocs: (state, action: PayloadAction<boolean>) => {
      state.highlightReviewedDocs = action.payload;
      // only one highlight at a time
      if (state.highlightReviewedDocs) {
        state.highlightedTopicId = undefined;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'atlas' state.");
      resetAtlasState(state);
      resetProjectFilterState({ state, defaultFilterExpression, projectId: action.payload, sliceName: "atlas" });
    });
  },
});

export const AtlasActions = atlasSlice.actions;

export default atlasSlice.reducer;
