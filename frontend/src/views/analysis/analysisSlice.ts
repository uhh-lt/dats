import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import ConfirmationAPI from "../../features/ConfirmationDialog/ConfirmationAPI";

export interface TimelineAnalysisConcept {
  name: string;
  color: string;
  visible: boolean;
  type: "sentence" | "wordlist" | "code";
  data: string[];
}

export interface AnalysisState {
  selectedUserIds: number[] | undefined;
  groupBy: "day" | "month" | "year";
  metadataKey: string;
  metadataCheckerOpen: boolean;
  threshold: number;
  conceptEditorOpen: boolean;
  currentConcept: TimelineAnalysisConcept;
  concepts: TimelineAnalysisConcept[];
  provenanceDate: string | undefined;
  provenanceConcept: string | undefined;
}

const initialState: AnalysisState = {
  selectedUserIds: undefined,
  groupBy: "year",
  metadataKey: "date",
  metadataCheckerOpen: false,
  threshold: 75,
  conceptEditorOpen: false,
  currentConcept: {
    name: "",
    color: "#ff0000",
    visible: true,
    type: "sentence",
    data: [],
  },
  concepts: [],
  provenanceDate: undefined,
  provenanceConcept: undefined,
};

export const analysisSlice = createSlice({
  name: "analysis",
  initialState,
  reducers: {
    setSelectedUserIds: (state, action: PayloadAction<number[]>) => {
      state.selectedUserIds = action.payload;
    },
    setGroupBy: (state, action: PayloadAction<"day" | "month" | "year">) => {
      state.groupBy = action.payload;
    },
    setMetadataKey: (state, action: PayloadAction<string>) => {
      state.metadataKey = action.payload;
    },
    setMetadataCheckerOpen: (state, action: PayloadAction<boolean>) => {
      state.metadataCheckerOpen = action.payload;
    },
    setThreshold: (state, action: PayloadAction<number>) => {
      state.threshold = action.payload;
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
    deleteConcept: (state, action: PayloadAction<TimelineAnalysisConcept>) => {
      const index = state.concepts.findIndex((c) => c.name === action.payload.name);
      if (index !== -1) {
        // ConfirmationAPI.openConfirmationDialog({
        //   text: `Do you really want to remove the concept with index - ${index}? Note - This action cannot be undone!`,
        //   onAccept: () => state.concepts.splice(index, 1),
        // });
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
  },
});

export const AnalysisActions = analysisSlice.actions;

export default analysisSlice.reducer;
