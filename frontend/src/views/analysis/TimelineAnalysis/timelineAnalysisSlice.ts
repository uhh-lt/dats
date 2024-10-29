import { createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { LogicalOperator } from "../../../api/openapi/models/LogicalOperator.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { TimelineAnalysisColumns } from "../../../api/openapi/models/TimelineAnalysisColumns.ts";
import { TimelineAnalysisConcept_Output } from "../../../api/openapi/models/TimelineAnalysisConcept_Output.ts";
import {
  createInitialFilterState,
  filterReducer,
  FilterState,
  resetProjectFilterState,
} from "../../../components/FilterDialog/filterSlice.ts";
import { MyFilterExpression } from "../../../components/FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../../components/Project/projectSlice.ts";
import ColorUtils from "../../../utils/ColorUtils.ts";

export interface TimelineAnalysisState {
  // project state:
  lastOpenedTimelineAnalysisId: number | undefined;
  metadataCheckerOpen: boolean;
  conceptEditorOpen: boolean;
  currentConcept: TimelineAnalysisConcept_Output;
  provenanceDate: string | undefined;
  provenanceConcept: string | undefined;
  isBarPlot: boolean;
}

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: TimelineAnalysisColumns.TA_SOURCE_DOCUMENT_FILENAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState: FilterState & TimelineAnalysisState = {
  ...createInitialFilterState(defaultFilterExpression),
  // project state:
  lastOpenedTimelineAnalysisId: undefined,
  metadataCheckerOpen: false,
  conceptEditorOpen: false,
  currentConcept: {
    id: uuidv4(),
    name: "",
    color: "#ff0000",
    visible: true,
    description: "",
    filter: {
      id: uuidv4(),
      items: [],
      logic_operator: LogicalOperator.AND,
    },
  },
  provenanceDate: undefined,
  provenanceConcept: undefined,
  isBarPlot: false,
};

const resetTimelineAnalysisState = (state: Draft<FilterState & TimelineAnalysisState>, projectId: number) => {
  resetProjectFilterState({ state, defaultFilterExpression, sliceName: "timelineAnalysis", projectId });
  state.lastOpenedTimelineAnalysisId = initialState.lastOpenedTimelineAnalysisId;
  state.metadataCheckerOpen = initialState.metadataCheckerOpen;
  state.conceptEditorOpen = initialState.conceptEditorOpen;
  state.currentConcept = initialState.currentConcept;
  state.provenanceDate = initialState.provenanceDate;
  state.provenanceConcept = initialState.provenanceConcept;
  state.isBarPlot = initialState.isBarPlot;
};

export const timelineAnalysisSlice = createSlice({
  name: "timelineAnalysis",
  initialState,
  reducers: {
    ...filterReducer,
    setMetadataCheckerOpen: (state, action: PayloadAction<boolean>) => {
      state.metadataCheckerOpen = action.payload;
    },
    setCurrentConcept: (state, action: PayloadAction<TimelineAnalysisConcept_Output>) => {
      state.currentConcept = {
        ...action.payload,
        color: ColorUtils.rgbStringToHex(action.payload.color) || action.payload.color,
      };
    },
    resetCurrentConcept: (state) => {
      state.currentConcept = initialState.currentConcept;
    },
    setProvenanceDate: (state, action: PayloadAction<string | undefined>) => {
      state.provenanceDate = action.payload;
    },
    setProvenanceConcept: (state, action: PayloadAction<string | undefined>) => {
      state.provenanceConcept = action.payload;
    },
    onStartConceptEdit: (state, action: PayloadAction<{ concept: TimelineAnalysisConcept_Output }>) => {
      state.conceptEditorOpen = true;
      state.currentConcept = {
        ...action.payload.concept,
        color: ColorUtils.rgbStringToHex(action.payload.concept.color) || action.payload.concept.color,
      };
    },
    onFinishConceptEdit: (state) => {
      state.conceptEditorOpen = false;
      state.currentConcept = initialState.currentConcept;
    },
    onCancelConceptEdit: (state) => {
      state.conceptEditorOpen = false;
      state.currentConcept = initialState.currentConcept;
    },
    onTogglePlotType: (state) => {
      state.isBarPlot = !state.isBarPlot;
    },
    onOpenTimelineAnalysis: (state, action: PayloadAction<{ analysisId: number; projectId: number }>) => {
      if (state.lastOpenedTimelineAnalysisId !== action.payload.analysisId) {
        console.log("Timeline Analysis changed! Resetting 'timelineAnalysis' state.");
        resetTimelineAnalysisState(state, action.payload.projectId);
      }
      state.lastOpenedTimelineAnalysisId = action.payload.analysisId;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'timelineAnalysis' state.");
      resetTimelineAnalysisState(state, action.payload);
    });
  },
});

export const TimelineAnalysisActions = timelineAnalysisSlice.actions;

export default timelineAnalysisSlice.reducer;
