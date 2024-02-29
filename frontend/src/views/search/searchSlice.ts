import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { MRT_DensityState, MRT_PaginationState, MRT_RowSelectionState, MRT_SortingState } from "material-react-table";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { QueryType } from "./QueryType.ts";

interface SearchState {
  isSplitView: boolean;
  isShowEntities: boolean;
  isShowTags: boolean;
  resultModalities: DocType[];
  searchType: QueryType;
  searchQuery: string | number;
  isTableView: boolean;
  expertMode: boolean;
  selectedDocumentIds: number[];
  selectionModel: MRT_RowSelectionState;
  paginationModel: MRT_PaginationState;
  sortingModel: MRT_SortingState;
  gridDensity: MRT_DensityState;
}

const initialState: SearchState = {
  selectedDocumentIds: [],
  isSplitView: false,
  isShowEntities: true,
  isShowTags: true,
  resultModalities: [DocType.TEXT, DocType.IMAGE, DocType.VIDEO, DocType.AUDIO],
  searchType: QueryType.LEXICAL,
  searchQuery: "",
  isTableView: false,
  selectionModel: {},
  paginationModel: {
    pageIndex: 0,
    pageSize: 10,
  },
  sortingModel: [],
  gridDensity: "comfortable",
  expertMode: false,
};

export const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    // document selection
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

    // ui
    toggleSplitView: (state) => {
      state.isSplitView = !state.isSplitView;
    },
    onToggleTableView: (state) => {
      state.isTableView = !state.isTableView;
    },
    toggleShowEntities: (state) => {
      state.isShowEntities = !state.isShowEntities;
    },
    toggleShowTags: (state) => {
      state.isShowTags = !state.isShowTags;
    },
    setTableDensity: (state, action: PayloadAction<MRT_DensityState>) => {
      state.gridDensity = action.payload;
    },
    // pagination
    setRowsPerPage: (state, action: PayloadAction<number>) => {
      state.paginationModel.pageSize = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.paginationModel.pageIndex = action.payload;
    },
    onPaginationModelChange: (state, action: PayloadAction<MRT_PaginationState>) => {
      state.paginationModel = action.payload;
    },
    setResultModalites: (state, action: PayloadAction<DocType[]>) => {
      state.resultModalities = action.payload.sort();
    },
    toggleModality: (state, action: PayloadAction<DocType>) => {
      const index = state.resultModalities.indexOf(action.payload);
      if (index === -1) {
        state.resultModalities.push(action.payload);
      } else {
        state.resultModalities.splice(index, 1);
      }
      state.resultModalities = state.resultModalities.sort();
      // reset page to 0, when modalities are changed
      state.paginationModel.pageIndex = 0;
    },
    setSearchType: (state, action: PayloadAction<QueryType>) => {
      state.searchType = action.payload;
    },

    // search
    onChangeSearchQuery: (state, action: PayloadAction<string | number>) => {
      state.searchQuery = action.payload;
    },
    onClearSearch: (state) => {
      state.searchQuery = "";
      state.searchType = QueryType.LEXICAL;
      state.selectedDocumentIds = [];
    },
    onChangeExpertMode: (state, action: PayloadAction<boolean>) => {
      state.expertMode = action.payload;
    },
    onSearchWithSimilarity: (state, action: PayloadAction<{ query: string | number; searchType: QueryType }>) => {
      switch (action.payload.searchType) {
        case QueryType.SEMANTIC_IMAGES:
          state.resultModalities = [DocType.IMAGE];
          break;
        case QueryType.SEMANTIC_SENTENCES:
          state.resultModalities = [DocType.TEXT];
          break;
        case QueryType.LEXICAL:
          state.resultModalities = [DocType.TEXT];
          break;
      }
      state.searchType = action.payload.searchType;
      state.selectedDocumentIds = [];
      state.searchQuery = action.payload.query;
    },
    onUpdateSelectionModel: (state, action: PayloadAction<MRT_RowSelectionState>) => {
      state.selectionModel = action.payload;
    },
  },
});

// actions
export const SearchActions = searchSlice.actions;

// selectors
export const getSelectedDocumentIds = (state: SearchState) => state.selectedDocumentIds;

export default persistReducer(
  {
    key: "search",
    storage,
  },
  searchSlice.reducer,
);
