import { DEFAULT_PROCESSING_SETTINGS } from "@components/defaultProcessingSettings";
import { ProcessingSettings } from "@models/ProcessingSettings";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";

interface HealthState extends TableState {
  processingSettings: ProcessingSettings;
}

const initialState: HealthState = {
  ...initialTableState,
  processingSettings: DEFAULT_PROCESSING_SETTINGS,
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
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'health' state.");
      resetProjectTableState(state);
      state.processingSettings = initialState.processingSettings;
    });
  },
});

export const HealthActions = healthSlice.actions;
export const healthReducer = { [healthSlice.name]: healthSlice.reducer };
