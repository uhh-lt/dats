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
  lastAtlasCotaId: number | undefined;
  selectedSdocIds: number[];
  selectedTopicId: string | undefined;
}

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: SdocColumns.SD_SOURCE_DOCUMENT_FILENAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState: AtlasState & FilterState = {
  ...createInitialFilterState(defaultFilterExpression),
  lastAtlasCotaId: undefined,
  selectedTopicId: undefined,
  selectedSdocIds: [],
};

const resetAtlasState = (state: Draft<AtlasState>) => {
  state.lastAtlasCotaId = initialState.lastAtlasCotaId;
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
    onSelectTopic: (state, action: PayloadAction<{ topicId: string }>) => {
      if (state.selectedTopicId === action.payload.topicId) {
        state.selectedTopicId = undefined;
        return;
      }
      state.selectedTopicId = action.payload.topicId;
    },
    onOpenMap: (state, action: PayloadAction<{ projectId: number; atlasId: number }>) => {
      if (state.lastAtlasCotaId !== action.payload.atlasId) {
        console.log("Atlas changed! Resetting 'atlas' state.");
        resetAtlasState(state);
        resetProjectFilterState({
          state,
          defaultFilterExpression,
          projectId: action.payload.projectId,
          sliceName: "atlas",
        });
        state.lastAtlasCotaId = action.payload.atlasId;
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
