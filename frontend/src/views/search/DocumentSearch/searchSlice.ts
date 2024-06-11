import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { TableState, initialTableState, tableReducer } from "../../../components/tableSlice.ts";
import { SearchFilterActions } from "../searchFilterSlice.ts";

interface SearchState {
  expertSearchMode: boolean;
  selectedDocumentId: number | undefined;
  sortStatsByGlobal: boolean;
}

const initialState: TableState & SearchState = {
  ...initialTableState,
  selectedDocumentId: undefined,
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
    builder.addCase(SearchFilterActions.init, (state, action) => {
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
