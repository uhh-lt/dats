import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { ProjectActions } from "../../../components/Project/projectSlice.ts";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "../../../components/tableSlice.ts";
import { SearchFilterActions } from "../searchFilterSlice.ts";

interface SearchState {
  // project state:
  selectedDocumentId: number | undefined; // the id of the selected document. Used to highlight the selected document in the table, and to show the document information (tags, metadata etc.).
  // app state:
  expertSearchMode: boolean; // whether the expert search mode is enabled.
  sortStatsByGlobal: boolean; // whether the search statistics are sorted by the global frequency or the "local" ().
}

const initialState: TableState & SearchState = {
  ...initialTableState,
  // project state:
  selectedDocumentId: undefined,
  // app state:
  expertSearchMode: false,
  sortStatsByGlobal: false,
};

export const searchSlice = createSlice({
  name: "search",
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
    // search statistics
    onToggleSortStatsByGlobal: (state) => {
      state.sortStatsByGlobal = !state.sortStatsByGlobal;
    },
    // expert mode
    onChangeExpertSearchMode: (state, action: PayloadAction<boolean>) => {
      state.expertSearchMode = action.payload;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        console.log("Project changed! Resetting 'search' state.");
        state.selectedDocumentId = initialState.selectedDocumentId;
        resetProjectTableState(state);
      })
      .addCase(SearchFilterActions.init, (state, action) => {
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
export const SearchActions = searchSlice.actions;

export default persistReducer(
  {
    key: "search",
    storage,
  },
  searchSlice.reducer,
);
