import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DocType, SourceDocumentMetadataReadResolved } from "../../api/openapi";
import { QueryType } from "./QueryType";
import { GridPaginationModel, GridSortModel } from "@mui/x-data-grid";

interface SearchState {
  selectedDocumentIds: number[];
  isSplitView: boolean;
  isShowEntities: boolean;
  isShowTags: boolean;
  page: number;
  rowsPerPage: number;
  resultModalities: DocType[];
  searchType: QueryType;
  searchQuery: string | number;
  isTableView: boolean;
  sortModel: GridSortModel;
  expertMode: boolean;
}

const initialState: SearchState = {
  selectedDocumentIds: [],
  isSplitView: false,
  isShowEntities: true,
  isShowTags: true,
  page: 0,
  rowsPerPage: 10,
  resultModalities: [DocType.TEXT, DocType.IMAGE, DocType.VIDEO, DocType.AUDIO],
  searchType: QueryType.LEXICAL,
  searchQuery: "",
  isTableView: false,
  sortModel: [],
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
    onSortModelChange: (state, action: PayloadAction<GridSortModel>) => {
      state.sortModel = action.payload;
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
    // pagination
    setRowsPerPage: (state, action: PayloadAction<number>) => {
      state.rowsPerPage = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    onPaginationModelChange: (state, action: PayloadAction<GridPaginationModel>) => {
      state.page = action.payload.page;
      state.rowsPerPage = action.payload.pageSize;
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
      // reset page to 0, when modalities are changed
      state.page = 0;
    },
    setSearchType: (state, action: PayloadAction<QueryType>) => {
      state.searchType = action.payload;
    },

    // filtering
    onAddKeywordFilter: (state, action: PayloadAction<{ keywordMetadataIds: number[]; keyword: string }>) => {
      console.log("added keywod filter!");
    },
    onAddTagFilter: (state, action: PayloadAction<{ tagId: number | string }>) => {
      console.log("added tag filter!");
    },
    onAddFilenameFilter: (state, action: PayloadAction<{ filename: string }>) => {
      console.log("added filename filter!");
    },
    onAddSpanAnnotationFilter: (state, action: PayloadAction<{ codeId: number; spanText: string }>) => {
      console.log("added span annotation filter!");
    },
    onAddMetadataFilter: (state, action: PayloadAction<{ metadata: SourceDocumentMetadataReadResolved }>) => {
      console.log("added metadata filter!");
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
  },
});

// actions
export const SearchActions = searchSlice.actions;

// selectors
export const getSelectedDocumentIds = (state: SearchState) => state.selectedDocumentIds;

export default searchSlice.reducer;
