import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  MRT_ColumnSizingState,
  MRT_DensityState,
  MRT_RowSelectionState,
  MRT_SortingState,
  MRT_VisibilityState,
} from "material-react-table";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { SearchFilterActions } from "../search/searchFilterSlice.ts";

interface SentenceSearchState {
  searchQuery: string;
  threshold: number;
  topK: number;
  selectedDocumentIds: number[];
  selectedDocumentId: number | undefined;
  selectionModel: MRT_RowSelectionState;
  sortingModel: MRT_SortingState;
  columnVisibilityModel: MRT_VisibilityState;
  columnSizingModel: MRT_ColumnSizingState;
  gridDensity: MRT_DensityState;
}

const initialState: SentenceSearchState = {
  searchQuery: "",
  threshold: 0.0,
  topK: 10,
  selectedDocumentIds: [],
  selectedDocumentId: undefined,
  selectionModel: {},
  sortingModel: [],
  columnVisibilityModel: {},
  columnSizingModel: {},
  gridDensity: "comfortable",
};

export const sentenceSearchSlice = createSlice({
  name: "sentenceSearch",
  initialState,
  reducers: {
    // document selection
    onToggleSelectedDocumentIdChange: (state, action: PayloadAction<number | undefined>) => {
      // toggle
      if (state.selectedDocumentId === action.payload) {
        state.selectedDocumentId = undefined;
      } else {
        state.selectedDocumentId = action.payload;
      }
    },
    toggleDocument: (state, action: PayloadAction<number>) => {
      const selectedIndex = state.selectedDocumentIds.indexOf(action.payload);
      if (selectedIndex === -1) {
        state.selectedDocumentIds.push(action.payload);
      } else if (selectedIndex === 0) {
        state.selectedDocumentIds = state.selectedDocumentIds.slice(1);
      } else if (selectedIndex === state.selectedDocumentIds.length - 1) {
        state.selectedDocumentIds = state.selectedDocumentIds.slice(0, -1);
      } else if (selectedIndex > 0) {
        state.selectedDocumentIds = [
          ...state.selectedDocumentIds.slice(0, selectedIndex),
          ...state.selectedDocumentIds.slice(selectedIndex + 1),
        ];
      }
    },
    setSelectedDocuments: (state, action: PayloadAction<number[]>) => {
      state.selectedDocumentIds = Array.from(action.payload);
    },
    clearSelectedDocuments: (state) => {
      state.selectedDocumentIds = [];
    },
    updateSelectedDocumentsOnDelete: (state, action: PayloadAction<number>) => {
      state.selectedDocumentIds = state.selectedDocumentIds.filter((sdocId) => sdocId !== action.payload);
    },
    updateSelectedDocumentsOnMultiDelete: (state, action: PayloadAction<number[]>) => {
      state.selectedDocumentIds = state.selectedDocumentIds.filter((sdocId) => action.payload.indexOf(sdocId) === -1);
    },

    // sorting
    onSortModelChange: (state, action: PayloadAction<MRT_SortingState>) => {
      state.sortingModel = action.payload;
    },

    // column visibility
    onColumnVisibilityChange: (state, action: PayloadAction<MRT_VisibilityState>) => {
      state.columnVisibilityModel = action.payload;
    },
    // column visibility
    onColumnSizingChange: (state, action: PayloadAction<MRT_ColumnSizingState>) => {
      state.columnSizingModel = action.payload;
    },

    setTableDensity: (state, action: PayloadAction<MRT_DensityState>) => {
      state.gridDensity = action.payload;
    },

    // search
    onChangeSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    onClearSearch: (state) => {
      state.searchQuery = "";
      state.selectedDocumentIds = [];
    },
    onUpdateSelectionModel: (state, action: PayloadAction<MRT_RowSelectionState>) => {
      state.selectionModel = action.payload;
      state.selectedDocumentIds = Object.keys(action.payload).map((key) => parseInt(key));
    },

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
export const SentenceSearchActions = sentenceSearchSlice.actions;

// selectors
export const getSelectedDocumentIds = (state: SentenceSearchState) => state.selectedDocumentIds;

export default persistReducer(
  {
    key: "sentenceSearch",
    storage,
  },
  sentenceSearchSlice.reducer,
);
