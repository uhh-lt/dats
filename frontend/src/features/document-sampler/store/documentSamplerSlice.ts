import { createSelector, createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";
import { RootState } from "@store/store";
import { ChartDataPoint } from "../_types/ChartDataPoint";

export interface DocumentSamplerState {
  aggregationGroups: Record<string, number[]>;
  isFixedSamplingStrategy: boolean;
  fixedSamplingValue: number;
  maxFixedSamplingValue: number;
  relativeSamplingValue: number;
  chartData: ChartDataPoint[];
  isDataBarPlot: boolean;
  isSampleBarPlot: boolean;
  oldValues: string;
}

const initialState: DocumentSamplerState = {
  aggregationGroups: {},
  isFixedSamplingStrategy: true,
  fixedSamplingValue: 1,
  maxFixedSamplingValue: 1,
  relativeSamplingValue: 0.1,
  chartData: [],
  isDataBarPlot: true,
  isSampleBarPlot: true,
  oldValues: "",
};

const computeValueRepresentation = (state: DocumentSamplerState) => {
  return JSON.stringify({
    aggregationGroups: state.aggregationGroups,
    fixedSamplingValue: state.fixedSamplingValue,
    relativeSamplingValue: state.relativeSamplingValue,
  });
};

const resetDocumentSamplerState = (state: Draft<DocumentSamplerState>) => {
  state.aggregationGroups = initialState.aggregationGroups;
  state.chartData = initialState.chartData;
  state.fixedSamplingValue = initialState.fixedSamplingValue;
  state.relativeSamplingValue = initialState.relativeSamplingValue;
  state.maxFixedSamplingValue = initialState.maxFixedSamplingValue;
};

const documentSamplerSlice = createSlice({
  name: "documentSampler",
  initialState,
  reducers: {
    onFixedSamplingValueChange: (state, action: PayloadAction<number>) => {
      state.fixedSamplingValue = action.payload;
    },
    onRelativeSamplingValueChange: (state, action: PayloadAction<number>) => {
      state.relativeSamplingValue = action.payload;
    },
    onSamplingStrategyChange: (state, action: PayloadAction<boolean>) => {
      state.isFixedSamplingStrategy = action.payload;
    },
    onGroupNameChange: (state, action: PayloadAction<{ oldName: string; newName: string }>) => {
      const { oldName, newName } = action.payload;
      const currentGroupTagIds = state.aggregationGroups[oldName];
      const newState = { ...state.aggregationGroups };
      delete newState[oldName];
      newState[newName] = currentGroupTagIds;
      state.aggregationGroups = newState;
    },
    onUpdateGroupTags: (state, action: PayloadAction<{ groupName: string; tagIds: number[] }>) => {
      const { groupName, tagIds } = action.payload;
      state.aggregationGroups[groupName] = tagIds;
    },
    onAddNewGroup: (state) => {
      state.aggregationGroups[`Group ${crypto.randomUUID().substring(0, 4)}`] = [];
    },
    onDeleteGroup: (state, action: PayloadAction<string>) => {
      const groupName = action.payload;
      const newState = { ...state.aggregationGroups };
      delete newState[groupName];
      state.aggregationGroups = newState;
    },
    onReset: (state) => {
      resetDocumentSamplerState(state);
    },
    onUpdateChartData: (state, action: PayloadAction<ChartDataPoint[]>) => {
      state.chartData = action.payload;
      state.maxFixedSamplingValue = Math.min(...action.payload.map((x) => x.count));
      state.oldValues = computeValueRepresentation(state);
    },
    onToggleSampleView: (state) => {
      state.isSampleBarPlot = !state.isSampleBarPlot;
    },
    onToggleDataView: (state) => {
      state.isDataBarPlot = !state.isDataBarPlot;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'documentSampler' state.");
      resetDocumentSamplerState(state);
      state.oldValues = initialState.oldValues;
    });
  },
});

export const DocumentSamplerActions = documentSamplerSlice.actions;

const selectDocumentSamplerState = (state: RootState) => state.documentSampler;

export const selectIsValuesOutdated = createSelector([selectDocumentSamplerState], (documentSamplerState) => {
  return documentSamplerState.oldValues !== computeValueRepresentation(documentSamplerState);
});

export const documentSamplerReducer = { [documentSamplerSlice.name]: documentSamplerSlice.reducer };
