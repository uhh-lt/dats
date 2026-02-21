import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { TagRead } from "../../../api/openapi/models/TagRead.ts";
import { RootState } from "../../../store/store.ts";
import { ChartDataPoint } from "./ChartDataPoint.ts";

export interface DocumentSamplerState {
  aggregationGroups: Record<string, TagRead[]>;
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

export const documentSamplerSlice = createSlice({
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
      const currentGroupTags = state.aggregationGroups[oldName];
      const newState = { ...state.aggregationGroups };
      delete newState[oldName];
      newState[newName] = currentGroupTags;
      state.aggregationGroups = newState;
    },
    onUpdateGroupTags: (state, action: PayloadAction<{ groupName: string; tags: TagRead[] }>) => {
      const { groupName, tags } = action.payload;
      state.aggregationGroups[groupName] = tags;
    },
    onAddNewGroup: (state) => {
      state.aggregationGroups[`Group ${uuidv4().substring(0, 4)}`] = [];
    },
    onDeleteGroup: (state, action: PayloadAction<string>) => {
      const groupName = action.payload;
      const newState = { ...state.aggregationGroups };
      delete newState[groupName];
      state.aggregationGroups = newState;
    },
    onReset: (state) => {
      state.aggregationGroups = initialState.aggregationGroups;
      state.chartData = initialState.chartData;
      state.fixedSamplingValue = initialState.fixedSamplingValue;
      state.relativeSamplingValue = initialState.relativeSamplingValue;
      state.maxFixedSamplingValue = initialState.maxFixedSamplingValue;
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
});

export const DocumentSamplerActions = documentSamplerSlice.actions;

const computeValueRepresentation = (state: DocumentSamplerState) => {
  return JSON.stringify({
    aggregationGroups: state.aggregationGroups,
    fixedSamplingValue: state.fixedSamplingValue,
    relativeSamplingValue: state.relativeSamplingValue,
  });
};

export const selectIsValuesOutdated = (state: RootState) =>
  state.documentSampler.oldValues !== computeValueRepresentation(state.documentSampler);

export const documentSamplerReducer = documentSamplerSlice.reducer;
