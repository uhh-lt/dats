import { Language } from "@models/Language";
import { ProcessingSettings } from "@models/ProcessingSettings";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

interface HealthState extends TableState {
  processingSettings: ProcessingSettings;
}

const initialState: HealthState = {
  ...initialTableState,
  processingSettings: {
    model: "default",
    extract_images: true,
    pages_per_chunk: 10,
    keyword_deduplication_threshold: 0.5,
    keyword_max_ngram_size: 2,
    keyword_number: 5,
    language: Language.AUTO,
  },
};

const healthSlice = createSlice({
  name: "health",
  initialState,
  reducers: {
    ...tableReducer,
    onProcessingSettingsChange: (state, action: PayloadAction<ProcessingSettings>) => {
      state.processingSettings = action.payload;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        resetProjectTableState(state);
        state.processingSettings = initialState.processingSettings;
      })
      .addDefaultCase(() => {});
  },
});

export const HealthActions = healthSlice.actions;
export const healthReducer = { [healthSlice.name]: healthSlice.reducer };
