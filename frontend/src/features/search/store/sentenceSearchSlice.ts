import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";
import { persistReducer } from "redux-persist";
import { persistStorage } from "@store/persistStorage";

interface SentenceSearchState extends TableState {
  // project state:
  selectedDocumentId: number | undefined;
}

const initialState: SentenceSearchState = {
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
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'sentenceSearch' state.");
      state.selectedDocumentId = initialState.selectedDocumentId;
      resetProjectTableState(state);
    });
  },
});

// actions
export const SentenceSearchActions = sentenceSearchSlice.actions;

export const sentenceSearchReducer = {
  [sentenceSearchSlice.name]: persistReducer(
    {
      key: sentenceSearchSlice.name,
      storage: persistStorage,
    },
    sentenceSearchSlice.reducer,
  ),
};
