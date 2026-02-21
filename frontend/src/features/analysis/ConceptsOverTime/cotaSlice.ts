import { createSlice, Draft, PayloadAction } from "@reduxjs/toolkit";
import { MRT_RowSelectionState } from "material-react-table";
import { COTAConcept } from "../../../api/openapi/models/COTAConcept.ts";
import { COTATrainingSettings } from "../../../api/openapi/models/COTATrainingSettings.ts";
import { DimensionalityReductionAlgorithm } from "../../../api/openapi/models/DimensionalityReductionAlgorithm.ts";
import { ProjectActions } from "../../../core/project/projectSlice.ts";
import { ColorUtils } from "../../../utils/ColorUtils.ts";

export interface CotaState {
  // project state:
  lastOpenedCotaId: number | undefined;
  conceptEditorOpen: boolean;
  currentConcept: COTAConcept;
  selectedDate: string | undefined;
  rowSelectionModel: MRT_RowSelectionState;
  provenanceConcept: string | undefined;
  selectedConceptId: string | undefined;
  isTimelineView: boolean;
  trainingSettingsOpen: boolean;
  // app state:
  trainingSettings: COTATrainingSettings;
}

const initialState: CotaState = {
  // project state:
  lastOpenedCotaId: undefined,
  conceptEditorOpen: false,
  currentConcept: {
    id: "1",
    name: "",
    description: "",
    color: "#ff0000",
    visible: true,
  },
  selectedConceptId: undefined,
  selectedDate: undefined,
  rowSelectionModel: {},
  provenanceConcept: undefined,
  isTimelineView: false,
  trainingSettingsOpen: false,
  // app state:
  trainingSettings: {
    dimensionality_reduction_algorithm: DimensionalityReductionAlgorithm.UMAP,
    dimensions: 64,
    epochs: 5,
    layers: 5,
    min_required_annotations_per_concept: 5,
    search_space_threshold: 0.8,
    search_space_topk: 1000,
  },
};

const resetCotaState = (state: Draft<CotaState>) => {
  state.lastOpenedCotaId = initialState.lastOpenedCotaId;
  state.conceptEditorOpen = initialState.conceptEditorOpen;
  state.currentConcept = initialState.currentConcept;
  state.selectedConceptId = initialState.selectedConceptId;
  state.selectedDate = initialState.selectedDate;
  state.rowSelectionModel = initialState.rowSelectionModel;
  state.provenanceConcept = initialState.provenanceConcept;
  state.isTimelineView = initialState.isTimelineView;
  state.trainingSettingsOpen = initialState.trainingSettingsOpen;
};

export const cotaSlice = createSlice({
  name: "cota",
  initialState,
  reducers: {
    setCurrentConcept: (state, action: PayloadAction<COTAConcept>) => {
      state.currentConcept = {
        ...action.payload,
        color: ColorUtils.rgbStringToHex(action.payload.color) || action.payload.color,
      };
    },
    resetCurrentConcept: (state) => {
      state.currentConcept = initialState.currentConcept;
    },
    setProvenanceDate: (state, action: PayloadAction<string | undefined>) => {
      state.selectedDate = action.payload;
    },
    setProvenanceConcept: (state, action: PayloadAction<string | undefined>) => {
      state.provenanceConcept = action.payload;
    },
    onStartConceptEdit: (state, action: PayloadAction<{ concept: COTAConcept }>) => {
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
    onSelectConcept: (state, action: PayloadAction<{ conceptId: string }>) => {
      if (state.selectedConceptId === action.payload.conceptId) {
        state.selectedConceptId = undefined;
        return;
      }
      state.selectedConceptId = action.payload.conceptId;
    },
    onToggleTimelineView: (state) => {
      state.isTimelineView = !state.isTimelineView;
      state.selectedDate = undefined;
    },
    onRowSelectionChange: (state, action: PayloadAction<MRT_RowSelectionState>) => {
      state.rowSelectionModel = action.payload;
    },
    onScatterPlotDotClick: (state, action: PayloadAction<string>) => {
      if (action.payload in state.rowSelectionModel) {
        delete state.rowSelectionModel[action.payload];
      } else {
        state.rowSelectionModel[action.payload] = true;
      }
    },
    onOpenTrainingSettings: (state, action: PayloadAction<{ trainingSettings: COTATrainingSettings }>) => {
      state.trainingSettingsOpen = true;
      state.trainingSettings = action.payload.trainingSettings;
    },
    onCloseTrainingSettings: (state) => {
      state.trainingSettingsOpen = false;
      state.trainingSettings = initialState.trainingSettings;
    },
    onTimelineDotClick: (state, action: PayloadAction<{ date: string; conceptId: string }>) => {
      state.selectedDate = action.payload.date;
      state.selectedConceptId = action.payload.conceptId;
      state.rowSelectionModel = {};
    },
    onOpenCota: (state, action: PayloadAction<{ analysisId: number }>) => {
      if (state.lastOpenedCotaId !== action.payload.analysisId) {
        console.log("COTA changed! Resetting 'cota' state.");
        resetCotaState(state);
      }
      state.lastOpenedCotaId = action.payload.analysisId;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'cota' state.");
      resetCotaState(state);
    });
  },
});

export const CotaActions = cotaSlice.actions;
export const cotaReducer = cotaSlice.reducer;
