import { createSlice } from "@reduxjs/toolkit";

export interface AnnotatorSettings {
  tagStyle: "inline" | "above";
}

export interface SettingsState {
  annotator: AnnotatorSettings;
}

const initialState: SettingsState = {
  annotator: {
    tagStyle: "inline",
  },
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    toggleAnnotatorTagStyle: (state) => {
      state.annotator = {
        ...state.annotator,
        tagStyle: state.annotator.tagStyle === "inline" ? "above" : "inline",
      };
    },
  },
});

export const SettingsActions = settingsSlice.actions;

export default settingsSlice.reducer;
