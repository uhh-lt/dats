import { createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
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
  selectedTopicId: number | undefined;
  // view settings
  colorBy: string | undefined;
  colorScheme: string;
  pointSize: number;
  showLabels: boolean;
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
  selectedTopicId: undefined,
  selectedSdocIds: [],
  // view settings
  colorBy: undefined,
  colorScheme: "viridis",
  pointSize: 5,
  showLabels: false,
};

const resetAtlasState = (state: Draft<AtlasState>) => {
  state.lastMapId = initialState.lastMapId;
  state.selectedTopicId = initialState.selectedTopicId;
  state.selectedSdocIds = initialState.selectedSdocIds;
};

export const atlasSlice = createSlice({
  name: "atlas",
  initialState,
  reducers: {
    ...filterReducer,
    onRowSelectionChange: (state, action: PayloadAction<number[]>) => {
      state.selectedSdocIds = action.payload.slice();
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
    onSelectTopic: (state, action: PayloadAction<number>) => {
      if (state.selectedTopicId === action.payload) {
        state.selectedTopicId = undefined;
        return;
      }
      state.selectedTopicId = action.payload;
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
    onChangeColorBy: (state, action: PayloadAction<string | undefined>) => {
      state.colorBy = action.payload;
    },
    onChangeColorScheme: (state, action: PayloadAction<string>) => {
      state.colorScheme = action.payload;
    },
    onChangePointSize: (state, action: PayloadAction<number>) => {
      state.pointSize = action.payload;
    },
    onChangeShowLabels: (state, action: PayloadAction<boolean>) => {
      state.showLabels = action.payload;
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
