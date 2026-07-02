import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";
import { persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/es/storage/createWebStorage";
import { SearchActions } from "./documentSearchSlice";
const storage = createWebStorage("local");

interface SentenceSearchState {
  // project state:
  selectedDocumentId: number | undefined;
}

const initialState: TableState & SentenceSearchState = {
  ...initialTableState,
  // project state:
  selectedDocumentId: undefined,
};

const sentenceSearchSlice = createSlice({
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

export const sentenceSearchReducer = {
  [sentenceSearchSlice.name]: persistReducer(
    {
      key: sentenceSearchSlice.name,
      storage,
    },
    sentenceSearchSlice.reducer,
  ),
};
