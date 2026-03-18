import { ColumnInfo } from "@core/filter";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";
import { persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/es/storage/createWebStorage";
const storage = createWebStorage("local");

export enum FolderSelection {
  FOLDER = "FOLDER",
  SDOC = "SDOC",
  UNKNOWN = "UNKNOWN",
}

interface SearchState {
  // project state:
  selectedDocumentId: number | undefined; // the id of the selected document. Used to highlight the selected document in the table, and to show the document information (tags, metadata etc.).
  selectedSdocFolderId: number | undefined; // the id of the selected sdoc folder document. Used to highlight the selected folder in the table, and to show the folder information (tags, metadata etc.).
  expandedTagIds: string[]; // the ids of the tags that are expanded in the tag tree.
  expandedFolderIds: string[]; // the ids of the folders that are expanded in the folder tree.
  showFolders: boolean; // whether the folders are shown in search table.
  scrollPosition: number; // the scroll position of the document table, used to restore position when returning to the table
  folderSelectionType: FolderSelection; // whether a folder or a document is selected
  // app state:
  sortStatsByGlobal: boolean; // whether the search statistics are sorted by the global frequency or the "local" ().
  column2Info: Record<string, ColumnInfo>;
}

const initialState: TableState & SearchState = {
  ...initialTableState,
  // project state:
  selectedDocumentId: undefined,
  selectedSdocFolderId: undefined,
  sortingModel: [{ id: SdocColumns.SD_SOURCE_DOCUMENT_NAME, desc: false }],
  expandedTagIds: [],
  expandedFolderIds: [],
  showFolders: true,
  scrollPosition: 0,
  folderSelectionType: FolderSelection.UNKNOWN,
  // app state:
  sortStatsByGlobal: false,
  column2Info: {},
};

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    ...tableReducer,
    // override tableReducer's onSearchQueryChange to reset selected document and folder when search query changes
    onSearchQueryChange: () => {
      console.error(
        "searchQuery is not stored in redux state! This action should not be dispatched. Please dispatch a navigation action to change the searchQuery in the url.",
      );
    },
    // initialize column info for URL-backed filter dialogs and column visibility for table
    init: (state, action: PayloadAction<{ columnInfoMap: Record<string, ColumnInfo> }>) => {
      state.column2Info = action.payload.columnInfoMap;
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
    },
    // document selection
    onToggleSelectedDocumentIdChange: (state, action: PayloadAction<number | undefined>) => {
      // toggle
      if (state.selectedDocumentId === action.payload) {
        state.selectedDocumentId = undefined;
      } else {
        state.selectedDocumentId = action.payload;
        state.selectedSdocFolderId = undefined; // either document or folder is selected!
      }
    },
    // folder selection
    onToggleSelectedSdocFolderIdChange: (state, action: PayloadAction<number | undefined>) => {
      // toggle
      if (state.selectedSdocFolderId === action.payload) {
        state.selectedSdocFolderId = undefined;
      } else {
        state.selectedSdocFolderId = action.payload;
        state.selectedDocumentId = undefined; // either document or folder is selected!
      }
    },
    // scroll position handling
    onSaveScrollPosition: (state, action: PayloadAction<number>) => {
      state.scrollPosition = action.payload;
    },
    onResetScrollPosition: (state) => {
      state.scrollPosition = 0;
    },
    updateSelectedDocumentsOnMultiDelete: (state, action: PayloadAction<number[]>) => {
      for (const sdocId of action.payload) {
        delete state.rowSelectionModel[`${sdocId}`];
      }
    },
    // folder selection type
    onFolderSelectionChange: (state, action: PayloadAction<FolderSelection>) => {
      state.folderSelectionType = action.payload;
    },
    // tag explorer
    setExpandedTagIds: (state, action: PayloadAction<string[]>) => {
      state.expandedTagIds = action.payload;
    },
    expandTags: (state, action: PayloadAction<string[]>) => {
      for (const tagId of action.payload) {
        if (state.expandedTagIds.indexOf(tagId) === -1) {
          state.expandedTagIds.push(tagId);
        }
      }
    },
    // folder explorer
    setExpandedFolderIds: (state, action: PayloadAction<string[]>) => {
      state.expandedFolderIds = action.payload;
    },
    expandFolders: (state, action: PayloadAction<string[]>) => {
      for (const folderId of action.payload) {
        if (state.expandedFolderIds.indexOf(folderId) === -1) {
          state.expandedFolderIds.push(folderId);
        }
      }
    },
    onMoveFolders: (state) => {
      state.rowSelectionModel = initialTableState.rowSelectionModel; // reset row selection model after moving folders
    },
    onToggleShowFolders: (state) => {
      state.showFolders = !state.showFolders;
    },
    // search statistics
    onToggleSortStatsByGlobal: (state) => {
      state.sortStatsByGlobal = !state.sortStatsByGlobal;
    },
  },
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'search' state.");
      state.selectedDocumentId = initialState.selectedDocumentId;
      state.expandedTagIds = initialState.expandedTagIds;
      state.scrollPosition = initialState.scrollPosition;
      state.expandedFolderIds = initialState.expandedFolderIds;
      state.folderSelectionType = initialState.folderSelectionType;
      state.column2Info = initialState.column2Info;
      resetProjectTableState(state);
    });
  },
});

// actions
export const SearchActions = searchSlice.actions;

export const searchReducer = {
  [searchSlice.name]: persistReducer(
    {
      key: searchSlice.name,
      storage,
    },
    searchSlice.reducer,
  ),
};
