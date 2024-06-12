import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { TableState, initialTableState, tableReducer } from "../../../components/tableSlice.ts";
import { SearchFilterActions } from "../searchFilterSlice.ts";

interface SentenceSearchState {
  threshold: number;
  topK: number;
  selectedDocumentId: number | undefined;
}

const initialState: TableState & SentenceSearchState = {
  ...initialTableState,
  threshold: 0.0,
  topK: 10,
  selectedDocumentId: undefined,
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

export default persistReducer(
  {
    key: "sentenceSearch",
    storage,
  },
  sentenceSearchSlice.reducer,
);
