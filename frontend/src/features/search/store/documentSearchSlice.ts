import { SdocColumns } from "@models/SdocColumns";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "@store/generic/tableSlice";
import { ProjectActions } from "@store/global/projectSlice";
import { persistReducer } from "redux-persist";
import { persistStorage } from "@store/persistStorage";

export enum FolderSelection {
  FOLDER = "FOLDER",
  SDOC = "SDOC",
  UNKNOWN = "UNKNOWN",
}

interface DocumentSearchState extends TableState {
  // project state:
  selectedDocumentId: number | undefined; // the id of the selected document. Used to highlight the selected document in the table, and to show the document information (tags, metadata etc.).
  selectedSdocFolderId: number | undefined; // the id of the selected sdoc folder document. Used to highlight the selected folder in the table, and to show the folder information (tags, metadata etc.).
  expandedTagIds: string[]; // the ids of the tags that are expanded in the tag tree.
  expandedFolderIds: string[]; // the ids of the folders that are expanded in the folder tree.
  scrollPosition: number; // the scroll position of the document table, used to restore position when returning to the table
  folderSelectionType: FolderSelection; // whether a folder or a document is selected
  // app state:
  sortStatsByGlobal: boolean; // whether the search statistics are sorted by the global frequency or the "local" ().
}

const initialState: DocumentSearchState = {
  ...initialTableState,
  // project state:
  selectedDocumentId: undefined,
  selectedSdocFolderId: undefined,
  sortingModel: [{ id: SdocColumns.SD_SOURCE_DOCUMENT_NAME, desc: false }],
  expandedTagIds: [],
  expandedFolderIds: [],
  scrollPosition: 0,
  folderSelectionType: FolderSelection.UNKNOWN,
  // app state:
  sortStatsByGlobal: false,
};

const documentSearchSlice = createSlice({
  name: "documentSearch",
  initialState,
  reducers: {
    ...tableReducer,
    // overwrite onSearchParamsChange to add folder reset
    onSearchParamsChange: (state) => {
      tableReducer.onSearchParamsChange(state);
      state.folderSelectionType = FolderSelection.UNKNOWN;
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
      if (state.folderSelectionType === action.payload) {
        return;
      }
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
    // showFolders lives in the URL (search param), the selected folder must not outlive hidden folders
    onFoldersHidden: (state) => {
      state.selectedSdocFolderId = undefined;
    },
    // search statistics
    onToggleSortStatsByGlobal: (state) => {
      state.sortStatsByGlobal = !state.sortStatsByGlobal;
    },
  },
  extraReducers(builder) {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'documentSearch' state.");
      state.selectedDocumentId = initialState.selectedDocumentId;
      state.expandedTagIds = initialState.expandedTagIds;
      state.scrollPosition = initialState.scrollPosition;
      state.expandedFolderIds = initialState.expandedFolderIds;
      state.folderSelectionType = initialState.folderSelectionType;
      resetProjectTableState(state);
    });
  },
});

// actions
export const DocumentSearchActions = documentSearchSlice.actions;

export const documentSearchReducer = {
  [documentSearchSlice.name]: persistReducer(
    {
      key: documentSearchSlice.name,
      storage: persistStorage,
    },
    documentSearchSlice.reducer,
  ),
};
