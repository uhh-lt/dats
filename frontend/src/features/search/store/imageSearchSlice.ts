import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";
import { persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/es/storage/createWebStorage";
const storage = createWebStorage("local");

interface ImageSearchState {
  // project state:
  selectedDocumentIds: number[];
  selectedDocumentId: number | undefined;
}

const initialState: ImageSearchState = {
  // project state:
  selectedDocumentIds: [],
  selectedDocumentId: undefined,
};

const imageSearchSlice = createSlice({
  name: "imageSearch",
  initialState,
  reducers: {
    // document selection
    onToggleSelectedDocumentId: (state, action: PayloadAction<number | undefined>) => {
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

    // search
    onClearSearch: (state) => {
      state.selectedDocumentIds = [];
      state.selectedDocumentId = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'imageSearch' state.");
      state.selectedDocumentIds = initialState.selectedDocumentIds;
      state.selectedDocumentId = initialState.selectedDocumentId;
    });
  },
});

// actions
export const ImageSearchActions = imageSearchSlice.actions;

// selectors
export const getSelectedDocumentIds = (state: ImageSearchState) => state.selectedDocumentIds;
export const imageSearchReducer = {
  [imageSearchSlice.name]: persistReducer(
    {
      key: imageSearchSlice.name,
      storage,
    },
    imageSearchSlice.reducer,
  ),
};
