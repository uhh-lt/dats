import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DateGroupBy } from "../../../api/openapi";

export interface TimelineAnalysisConcept {
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
  currentConcept: TimelineAnalysisConcept;
  concepts: TimelineAnalysisConcept[];
  provenanceDate: string | undefined;
  provenanceConcept: string | undefined;
  resultType: string;
}

const initialState: TimelineAnalysisState = {
  selectedUserIds: undefined,
  groupBy: DateGroupBy.YEAR,
  projectMetadataId: -1,
  metadataCheckerOpen: false,
  conceptEditorOpen: false,
  currentConcept: {
    name: "",
    color: "#ff0000",
    visible: true,
    type: "filter",
    data: "root",
  },
  concepts: [],
  provenanceDate: undefined,
  provenanceConcept: undefined,
  resultType: "document",
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
    setCurrentConcept: (state, action: PayloadAction<TimelineAnalysisConcept>) => {
      state.currentConcept = action.payload;
    },
    resetCurrentConcept: (state) => {
      state.currentConcept = initialState.currentConcept;
    },
    setConcepts: (state, action: PayloadAction<TimelineAnalysisConcept[]>) => {
      state.concepts = action.payload.slice();
    },
    toggleConceptVisibility: (state, action: PayloadAction<TimelineAnalysisConcept>) => {
      const concept = state.concepts.find((c) => c.name === action.payload.name);
      if (concept) {
        concept.visible = !concept.visible;
      }
      state.concepts = state.concepts.slice();
    },
    addOrUpdateConcept: (state, action: PayloadAction<TimelineAnalysisConcept>) => {
      const index = state.concepts.findIndex((c) => c.name === action.payload.name);
      if (index === -1) {
        state.concepts.push(action.payload);
      } else {
        state.concepts[index] = action.payload;
        state.concepts = state.concepts.slice();
      }
    },
    deleteConcept: (state, action: PayloadAction<{ concept: TimelineAnalysisConcept }>) => {
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
    setConceptEditorOpen: (state, action: PayloadAction<boolean>) => {
      state.conceptEditorOpen = action.payload;
    },
    setResultType: (state, action: PayloadAction<string>) => {
      state.resultType = action.payload;
    },
    openConceptEditorCreate: (state, action: PayloadAction<{ conceptData: string }>) => {
      state.conceptEditorOpen = true;
      state.currentConcept = {
        ...initialState.currentConcept,
        data: action.payload.conceptData,
      };
    },
    openConceptEditorEdit: (state, action: PayloadAction<{ concept: TimelineAnalysisConcept }>) => {
      state.conceptEditorOpen = true;
      state.currentConcept = action.payload.concept;
    },
    closeConceptEditor: (state) => {
      state.conceptEditorOpen = false;
    },
  },
});

export const TimelineAnalysisActions = timelineAnalysisSlice.actions;

export default timelineAnalysisSlice.reducer;
