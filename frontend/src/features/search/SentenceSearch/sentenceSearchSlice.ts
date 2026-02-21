import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { ProjectActions } from "../../../core/project/projectSlice.ts";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "../../../store/tableSlice.ts";
import { SearchActions } from "../DocumentSearch/searchSlice.ts";

interface SentenceSearchState {
  // project state:
  selectedDocumentId: number | undefined;
  // app state:
  threshold: number;
  topK: number;
}

const initialState: TableState & SentenceSearchState = {
  ...initialTableState,
  // project state:
  selectedDocumentId: undefined,
  // app state:
  threshold: 0.0,
  topK: 10,
};

export const sentenceSearchSlice = createSlice({
  name: "sentenceSearch",
  initialState,
  reducers: {
    ...tableReducer,
    // document selection
    onToggleSelectedDocumentIdChange: (state, action: PayloadAction<number | undefined>) => {
      // toggle
      if (state.selectedDocumentId === action.payload) {
        state.selectedDocumentId = undefined;
      } else {
        state.selectedDocumentId = action.payload;
      }
    },
    updateSelectedDocumentsOnMultiDelete: (state, action: PayloadAction<number[]>) => {
      for (const sdocId of action.payload) {
        delete state.rowSelectionModel[`${sdocId}`];
      }
    },
    // similarity search options
    onChangeSearchOptions: (state, action: PayloadAction<{ threshold: number; topK: number }>) => {
      state.threshold = action.payload.threshold;
      state.topK = action.payload.topK;
    },
    onChangeThreshold: (state, action: PayloadAction<number>) => {
      state.threshold = action.payload;
    },
    onChangeTopK: (state, action: PayloadAction<number>) => {
      state.topK = action.payload;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        console.log("Project changed! Resetting 'sentenceSearch' state.");
        state.selectedDocumentId = initialState.selectedDocumentId;
        resetProjectTableState(state);
      })
      .addCase(SearchActions.init, (state, action) => {
        state.columnVisibilityModel = Object.values(action.payload.columnInfoMap).reduce((acc, column) => {
          if (!column.column) return acc;
          // this is a normal column
          if (isNaN(parseInt(column.column))) {
            return acc;
            // this is a metadata column
          } else {
            return {
              ...acc,
              [column.column]: false,
            };
          }
        }, {});
      });
  },
});

// actions
export const SentenceSearchActions = sentenceSearchSlice.actions;

export const sentenceSearchReducer = persistReducer(
  {
    key: "sentenceSearch",
    storage,
  },
  sentenceSearchSlice.reducer,
);
