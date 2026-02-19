import { createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { BBoxColumns } from "../../../api/openapi/models/BBoxColumns.ts";
import { LogicalOperator } from "../../../api/openapi/models/LogicalOperator.ts";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SentAnnoColumns } from "../../../api/openapi/models/SentAnnoColumns.ts";
import { SpanColumns } from "../../../api/openapi/models/SpanColumns.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { TimelineAnalysisConcept } from "../../../api/openapi/models/TimelineAnalysisConcept.ts";
import { TimelineAnalysisType } from "../../../api/openapi/models/TimelineAnalysisType.ts";
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
  currentConcept: TimelineAnalysisConcept;
  provenanceDate: string | undefined;
  provenanceConcept: string | undefined;
  isBarPlot: boolean;
}

const defaultAnalysisType = TimelineAnalysisType.DOCUMENT;
const defaultFilterExpressions: Record<TimelineAnalysisType, MyFilterExpression> = {
  [TimelineAnalysisType.DOCUMENT]: {
    id: uuidv4(),
    column: SdocColumns.SD_SOURCE_DOCUMENT_NAME,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  },
  [TimelineAnalysisType.SENTENCE_ANNOTATION]: {
    id: uuidv4(),
    column: SentAnnoColumns.SENT_ANNO_SOURCE_SOURCE_DOCUMENT_NAME,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  },
  [TimelineAnalysisType.BBOX_ANNOTATION]: {
    id: uuidv4(),
    column: BBoxColumns.BB_SOURCE_SOURCE_DOCUMENT_NAME,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  },
  [TimelineAnalysisType.SPAN_ANNOTATION]: {
    id: uuidv4(),
    column: SpanColumns.SP_SOURCE_SOURCE_DOCUMENT_NAME,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  },
};

const initialState: FilterState & TimelineAnalysisState = {
  ...createInitialFilterState(defaultFilterExpressions[defaultAnalysisType]),
  // project state:
  lastOpenedTimelineAnalysisId: undefined,
  metadataCheckerOpen: false,
  conceptEditorOpen: false,
  currentConcept: {
    timeline_analysis_type: defaultAnalysisType,
    id: uuidv4(),
    name: "",
    color: "#ff0000",
    visible: true,
    description: "",
    ta_specific_filter: {
      timeline_analysis_type: defaultAnalysisType,
      filter: {
        id: uuidv4(),
        items: [],
        logic_operator: LogicalOperator.AND,
      },
    },
    results: [],
    filter_hash: -1,
  },
  provenanceDate: undefined,
  provenanceConcept: undefined,
  isBarPlot: false,
};

const resetTimelineAnalysisState = (
  state: Draft<FilterState & TimelineAnalysisState>,
  projectId: number | undefined,
  timelineAnalysisType: TimelineAnalysisType,
) => {
  resetProjectFilterState({
    state,
    defaultFilterExpression: defaultFilterExpressions[timelineAnalysisType],
    sliceName: "timelineAnalysis",
    projectId,
  });
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
    setCurrentConcept: (state, action: PayloadAction<TimelineAnalysisConcept>) => {
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
    onStartConceptEdit: (state, action: PayloadAction<{ concept: TimelineAnalysisConcept }>) => {
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
    onOpenTimelineAnalysis: (
      state,
      action: PayloadAction<{ analysisId: number; analysisType: TimelineAnalysisType; projectId: number }>,
    ) => {
      if (state.lastOpenedTimelineAnalysisId !== action.payload.analysisId) {
        console.log("Timeline Analysis changed! Resetting 'timelineAnalysis' state.");
        resetTimelineAnalysisState(state, action.payload.projectId, action.payload.analysisType);
      }
      state.lastOpenedTimelineAnalysisId = action.payload.analysisId;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state, action) => {
      console.log("Project changed! Resetting 'timelineAnalysis' state.");
      resetTimelineAnalysisState(state, action.payload, defaultAnalysisType);
    });
  },
});

export const TimelineAnalysisActions = timelineAnalysisSlice.actions;

export default timelineAnalysisSlice.reducer;
