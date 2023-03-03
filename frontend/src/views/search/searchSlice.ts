import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SearchFilter, FilterType } from "./SearchFilter";
import { QueryType } from "./QueryType";
import { DocType } from "../../api/openapi";

export interface AnchorState {
  pos: number;
  limit: number;
}

interface SearchState {
  selectedDocumentIds: number[];
  filters: SearchFilter[];
  filterAnchorInfo: { [id: string]: AnchorState };
  isSplitView: boolean;
  isShowEntities: boolean;
  isShowTags: boolean;
  isListView: boolean;
  page: number;
  rowsPerPage: number;
  resultModalities: DocType[];
  searchType: QueryType;
}

const initialState: SearchState = {
  selectedDocumentIds: [],
  filters: [],
  filterAnchorInfo: {},
  isSplitView: false,
  isShowEntities: true,
  isShowTags: true,
  isListView: false,
  page: 0,
  rowsPerPage: 10,
  resultModalities: [DocType.TEXT, DocType.IMAGE, DocType.VIDEO, DocType.AUDIO],
  searchType: QueryType.LEXICAL,
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

    // filtering
    addFilter: (state, action: PayloadAction<SearchFilter>) => {
      // it is only allowed to have either a single sentence filter, or multiple other filters
      if (action.payload.type === FilterType.SENTENCE || action.payload.type === FilterType.IMAGE) {
        state.filters = [];
      } else if (state.filters.find((f) => f.type === FilterType.SENTENCE || f.type === FilterType.IMAGE)) {
        state.filters = [];
      }

      // it is only allowed to have a single file filter
      // therefore, remove existing file filters before adding a new one
      if (action.payload.type === FilterType.FILENAME) {
        state.filters = state.filters.filter((f) => f.type !== FilterType.FILENAME);
      }

      // only add the filter, if it does not exist already
      if (!state.filters.some((f) => f.id === action.payload!.id)) {
        state.filters.push(action.payload);
        state.filterAnchorInfo[action.payload!.id] = { pos: -1, limit: -1 };
      }
    },
    removeFilter: (state, action: PayloadAction<SearchFilter>) => {
      const newFilters: SearchFilter[] = [];
      for (let i = 0; i < state.filters.length; i++) {
        let filter: SearchFilter = state.filters[i];
        if (filter.id === action.payload.id) {
          delete state.filterAnchorInfo[filter.id];
        } else {
          newFilters.push(filter);
        }
      }
      state.filters = newFilters;
    },
    setFilter: (state, action: PayloadAction<SearchFilter>) => {
      state.filters = [action.payload];
    },
    clearFilters: (state) => {
      state.filters = [];
    },
    increaseFilterAnchorPosition: (state, action: PayloadAction<string>) => {
      let anchorState = state.filterAnchorInfo[action.payload];
      if (anchorState) {
        let newPos = anchorState.pos + 1;
        if (newPos === anchorState.limit) {
          newPos = 0;
        }
        anchorState.pos = newPos;
      }
    },
    setFilterAnchorLimits: (state, action: PayloadAction<{ [id: string]: number }>) => {
      Object.entries(action.payload).forEach(([key, limit]) => {
        let anchorState = state.filterAnchorInfo[key];
        if (anchorState) {
          anchorState.limit = limit;
        }
      });
    },

    // ui
    toggleSplitView: (state) => {
      state.isSplitView = !state.isSplitView;
    },
    toggleShowEntities: (state) => {
      state.isShowEntities = !state.isShowEntities;
    },
    toggleShowTags: (state) => {
      state.isShowTags = !state.isShowTags;
    },
    toggleListView: (state) => {
      state.isListView = !state.isListView;
    },
    setRowsPerPage: (state, action: PayloadAction<number>) => {
      state.rowsPerPage = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setResultModalites: (state, action: PayloadAction<DocType[]>) => {
      state.resultModalities = action.payload.sort();
    },
    toggleModality: (state, action: PayloadAction<DocType>) => {
      let index = state.resultModalities.indexOf(action.payload);
      if (index === -1) {
        state.resultModalities.push(action.payload);
      } else {
        state.resultModalities.splice(index, 1);
      }
      state.resultModalities = state.resultModalities.sort();
    },
    setSearchType: (state, action: PayloadAction<QueryType>) => {
      state.searchType = action.payload;
    },
  },
});

// actions
export const SearchActions = searchSlice.actions;

// selectors
export const getSelectedDocumentIds = (state: SearchState) => state.selectedDocumentIds;

export default searchSlice.reducer;
