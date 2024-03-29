import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { DateGroupBy, LogicalOperator, TimelineAnalysisConcept_Output } from "../../../api/openapi";

export interface TimelineAnalysisConceptOLD {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  type: "filter";
  data: string; // if type === "filter", data is the root filter id
}

export interface TimelineAnalysisState {
  selectedUserIds: number[] | undefined;
  groupBy: DateGroupBy;
  projectMetadataId: number;
  metadataCheckerOpen: boolean;
  conceptEditorOpen: boolean;
  currentConcept: TimelineAnalysisConcept_Output;
  concepts: TimelineAnalysisConceptOLD[];
  provenanceDate: string | undefined;
  provenanceConcept: string | undefined;
  resultType: string;
  isBarPlot: boolean;
}

const initialState: TimelineAnalysisState = {
  selectedUserIds: undefined,
  groupBy: DateGroupBy.YEAR,
  projectMetadataId: -1,
  metadataCheckerOpen: false,
  conceptEditorOpen: false,
  currentConcept: {
    id: "1",
    name: "",
    color: "#ff0000",
    visible: true,
    description: "",
    filter: {
      items: [],
      logic_operator: LogicalOperator.AND,
    },
  },
  concepts: [],
  provenanceDate: undefined,
  provenanceConcept: undefined,
  resultType: "document",
  isBarPlot: false,
};

export const timelineAnalysisSlice = createSlice({
  name: "timelineAnalysis",
  initialState,
  reducers: {
    setSelectedUserIds: (state, action: PayloadAction<number[]>) => {
      state.selectedUserIds = action.payload;
    },
    setGroupBy: (state, action: PayloadAction<DateGroupBy>) => {
      state.groupBy = action.payload;
    },
    setProjectMetadataKey: (state, action: PayloadAction<number>) => {
      state.projectMetadataId = action.payload;
    },
    setMetadataCheckerOpen: (state, action: PayloadAction<boolean>) => {
      state.metadataCheckerOpen = action.payload;
    },
    setCurrentConcept: (state, action: PayloadAction<TimelineAnalysisConcept_Output>) => {
      state.currentConcept = action.payload;
    },
    resetCurrentConcept: (state) => {
      state.currentConcept = initialState.currentConcept;
    },
    setConcepts: (state, action: PayloadAction<TimelineAnalysisConceptOLD[]>) => {
      state.concepts = action.payload.slice();
    },
    toggleConceptVisibility: (state, action: PayloadAction<TimelineAnalysisConceptOLD>) => {
      const concept = state.concepts.find((c) => c.name === action.payload.name);
      if (concept) {
        concept.visible = !concept.visible;
      }
      state.concepts = state.concepts.slice();
    },
    deleteConcept: (state, action: PayloadAction<{ concept: TimelineAnalysisConceptOLD }>) => {
      const index = state.concepts.findIndex((c) => c.name === action.payload.concept.name);
      if (index !== -1) {
        state.concepts.splice(index, 1);
      }
    },
    setProvenanceDate: (state, action: PayloadAction<string | undefined>) => {
      state.provenanceDate = action.payload;
    },
    setProvenanceConcept: (state, action: PayloadAction<string | undefined>) => {
      state.provenanceConcept = action.payload;
    },
    setResultType: (state, action: PayloadAction<string>) => {
      state.resultType = action.payload;
    },
    onCreateNewConcept: (state, action: PayloadAction<{ conceptData: string }>) => {
      let name = "New Concept";
      let conceptIndex = 1;
      // eslint-disable-next-line no-loop-func
      while (state.concepts.find((c) => c.name === `${name} (${conceptIndex})`)) {
        conceptIndex++;
      }

      state.concepts.push({
        id: uuidv4(),
        name: `${name} (${conceptIndex})`,
        color: "#ff0000",
        visible: true,
        type: "filter",
        data: action.payload.conceptData,
      });
    },
    onStartConceptEdit: (state, action: PayloadAction<{ concept: TimelineAnalysisConcept_Output }>) => {
      state.conceptEditorOpen = true;
      state.currentConcept = action.payload.concept;
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
  },
});

export const TimelineAnalysisActions = timelineAnalysisSlice.actions;

export default timelineAnalysisSlice.reducer;
