import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SearchSettings {
  searchResStyle: "wordcloud" | "text";
  sortStatsByGlobal: boolean;
}

export interface AnnotatorSettings {
  tagStyle: "inline" | "above";
}

export interface SettingsState {
  search: SearchSettings;
  annotator: AnnotatorSettings;
  disabledCodeIds: number[];
}

const initialState: SettingsState = {
  search: {
    searchResStyle: "wordcloud",
    sortStatsByGlobal: false,
  },
  annotator: {
    tagStyle: "inline",
  },
  disabledCodeIds: [],
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    toggleSearchResStyle: (state) => {
      state.search = {
        ...state.search,
        searchResStyle: state.search.searchResStyle === "wordcloud" ? "text" : "wordcloud",
      };
    },
    toggleStatsOrder: (state) => {
      state.search = {
        ...state.search,
        sortStatsByGlobal: !state.search.sortStatsByGlobal,
      };
    },
    toggleAnnotatorTagStyle: (state) => {
      state.annotator = {
        ...state.annotator,
        tagStyle: state.annotator.tagStyle === "inline" ? "above" : "inline",
      };
    },
    disableCode: (state, action: PayloadAction<number>) => {
      const codeId = action.payload;
      const disabledCodeIds = state.disabledCodeIds;
      if (disabledCodeIds.indexOf(codeId) === -1) {
        disabledCodeIds.push(codeId);
        state.disabledCodeIds = disabledCodeIds;
      }
    },
    toggleCodeDisabled: (state, action: PayloadAction<number[]>) => {
      if (action.payload.length === 0) {
        return;
      }
      const codeId = action.payload[0];
      const disabledCodeIds = state.disabledCodeIds;
      if (disabledCodeIds.indexOf(codeId) === -1) {
        // add codes
        action.payload.forEach((codeId) => {
          if (disabledCodeIds.indexOf(codeId) === -1) {
            disabledCodeIds.push(codeId);
          }
        });
      } else {
        // delete codes
        action.payload.forEach((codeId) => {
          const index = disabledCodeIds.indexOf(codeId);
          if (index !== -1) {
            disabledCodeIds.splice(index, 1);
          }
        });
      }
      state.disabledCodeIds = disabledCodeIds;
    },
  },
});

export const SettingsActions = settingsSlice.actions;

export default settingsSlice.reducer;
