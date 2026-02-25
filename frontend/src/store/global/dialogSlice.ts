import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { CodeRead } from "../../api/openapi/models/CodeRead";
import { FolderRead } from "../../api/openapi/models/FolderRead";
import { TagRead } from "../../api/openapi/models/TagRead";
import { CodeCreateSuccessHandler } from "../../core/code/dialog/CodeCreateDialog";
import { MemoEvent } from "../../core/memo/dialog/_types/MemoEvent";

interface DialogState {
  // memo
  isMemoDialogOpen: boolean;
  memoEventData: MemoEvent | undefined;
  // tags
  isTagCreateDialogOpen: boolean;
  isTagEditDialogOpen: boolean;
  tagName?: string;
  tag?: TagRead;
  // folder
  isFolderCreateDialogOpen: boolean;
  isFolderEditDialogOpen: boolean;
  folderName?: string;
  folder?: FolderRead;
  // codes
  isCodeCreateDialogOpen: boolean;
  codeName?: string;
  parentCodeId?: number;
  isCodeEditDialogOpen: boolean;
  code?: CodeRead;
  codeCreateSuccessHandler: CodeCreateSuccessHandler;
  // span
  isSpanAnnotationEditDialogOpen: boolean;
  spanAnnotationIds: number[];
  spanAnnotationEditDialogOnEdit?: () => void;
  // sentence
  isSentenceAnnotationEditDialogOpen: boolean;
  sentenceAnnotationIds: number[];
  sentenceAnnotationEditDialogOnEdit?: () => void;
  // bbox
  isBBoxAnnotationEditDialogOpen: boolean;
  bboxAnnotationIds: number[];
  bboxAnnotationEditDialogOnEdit?: () => void;
  // document import
  isDocumentUploadOpen: boolean;
  // project settings
  isProjectSettingsOpen: boolean;
  // quick command menu
  isQuickCommandMenuOpen: boolean;
}

const initialState: DialogState = {
  // memo
  isMemoDialogOpen: false,
  memoEventData: undefined,
  // tags
  isTagEditDialogOpen: false,
  isTagCreateDialogOpen: false,
  tag: undefined,
  tagName: undefined,
  // folder
  isFolderEditDialogOpen: false,
  isFolderCreateDialogOpen: false,
  folder: undefined,
  folderName: undefined,
  // codes
  isCodeCreateDialogOpen: false,
  isCodeEditDialogOpen: false,
  codeName: undefined,
  parentCodeId: undefined,
  codeCreateSuccessHandler: undefined,
  code: undefined,
  // span
  isSpanAnnotationEditDialogOpen: false,
  spanAnnotationIds: [],
  spanAnnotationEditDialogOnEdit: undefined,
  // sentence
  isSentenceAnnotationEditDialogOpen: false,
  sentenceAnnotationIds: [],
  sentenceAnnotationEditDialogOnEdit: undefined,
  // bbox
  isBBoxAnnotationEditDialogOpen: false,
  bboxAnnotationIds: [],
  // document import
  isDocumentUploadOpen: false,
  // project settings
  isProjectSettingsOpen: false,
  // quick command menu
  isQuickCommandMenuOpen: false,
};

const dialogSlice = createSlice({
  name: "dialog",
  initialState,
  reducers: {
    // memo
    openMemoDialog: (state, action: PayloadAction<MemoEvent>) => {
      if (action.payload.memoId === undefined && action.payload.attachedObjectId === undefined) {
        throw new Error("You have to provide a memoId or an attachedObjectId!");
      }
      state.isMemoDialogOpen = true;
      state.memoEventData = action.payload;
    },
    closeMemoDialog: (state) => {
      state.isMemoDialogOpen = false;
      state.memoEventData = undefined;
    },
    // span anno
    openSpanAnnotationEditDialog: (
      state,
      action: PayloadAction<{ spanAnnotationIds: number[]; onEdit?: () => void }>,
    ) => {
      state.isSpanAnnotationEditDialogOpen = true;
      state.spanAnnotationIds = action.payload.spanAnnotationIds;
      state.spanAnnotationEditDialogOnEdit = action.payload.onEdit;
    },
    closeSpanAnnotationEditDialog: (state) => {
      state.isSpanAnnotationEditDialogOpen = false;
      state.spanAnnotationIds = [];
      state.spanAnnotationEditDialogOnEdit = undefined;
    },
    // sentence anno
    openSentenceAnnotationEditDialog: (
      state,
      action: PayloadAction<{ sentenceAnnotationIds: number[]; onEdit?: () => void }>,
    ) => {
      state.isSentenceAnnotationEditDialogOpen = true;
      state.sentenceAnnotationIds = action.payload.sentenceAnnotationIds;
      state.sentenceAnnotationEditDialogOnEdit = action.payload.onEdit;
    },
    closeSentenceAnnotationEditDialog: (state) => {
      state.isSentenceAnnotationEditDialogOpen = false;
      state.sentenceAnnotationIds = [];
      state.sentenceAnnotationEditDialogOnEdit = undefined;
    },
    // bbox anno
    openBBoxAnnotationEditDialog: (
      state,
      action: PayloadAction<{ bboxAnnotationIds: number[]; onEdit?: () => void }>,
    ) => {
      state.isBBoxAnnotationEditDialogOpen = true;
      state.bboxAnnotationIds = action.payload.bboxAnnotationIds;
      state.bboxAnnotationEditDialogOnEdit = action.payload.onEdit;
    },
    closeBBoxAnnotationEditDialog: (state) => {
      state.isBBoxAnnotationEditDialogOpen = false;
      state.bboxAnnotationIds = [];
      state.bboxAnnotationEditDialogOnEdit = undefined;
    },
    // tag
    openTagEditDialog: (state, action: PayloadAction<{ tag: TagRead }>) => {
      state.isTagEditDialogOpen = true;
      state.tag = action.payload.tag;
    },
    closeTagEditDialog: (state) => {
      state.isTagEditDialogOpen = false;
      state.tag = undefined;
    },
    openTagCreateDialog: (state, action: PayloadAction<{ tagName?: string }>) => {
      state.isTagCreateDialogOpen = true;
      state.tagName = action.payload.tagName;
    },
    closeTagCreateDialog: (state) => {
      state.isTagCreateDialogOpen = false;
      state.tagName = undefined;
    },
    // folder
    openFolderEditDialog: (state, action: PayloadAction<{ folder: FolderRead }>) => {
      state.isFolderEditDialogOpen = true;
      state.folder = action.payload.folder;
    },
    closeFolderEditDialog: (state) => {
      state.isFolderEditDialogOpen = false;
      state.folder = undefined;
    },
    openFolderCreateDialog: (state, action: PayloadAction<{ folderName?: string }>) => {
      state.isFolderCreateDialogOpen = true;
      state.folderName = action.payload.folderName;
    },
    closeFolderCreateDialog: (state) => {
      state.isFolderCreateDialogOpen = false;
      state.folderName = undefined;
    },
    // codes
    openCodeCreateDialog: (
      state,
      action: PayloadAction<{
        codeName?: string;
        parentCodeId?: number;
        codeCreateSuccessHandler?: CodeCreateSuccessHandler;
      }>,
    ) => {
      state.isCodeCreateDialogOpen = true;
      state.codeName = action.payload.codeName;
      state.parentCodeId = action.payload.parentCodeId;
      state.codeCreateSuccessHandler = action.payload.codeCreateSuccessHandler;
    },
    closeCodeCreateDialog: (state) => {
      state.isCodeCreateDialogOpen = false;
      state.codeName = undefined;
      state.parentCodeId = undefined;
      state.codeCreateSuccessHandler = undefined;
    },
    openCodeEditDialog: (state, action: PayloadAction<{ code: CodeRead }>) => {
      state.isCodeEditDialogOpen = true;
      state.code = action.payload.code;
    },
    closeCodeEditDialog: (state) => {
      state.isCodeEditDialogOpen = false;
      state.code = undefined;
    },
    openDocumentUpload: (state) => {
      state.isDocumentUploadOpen = true;
    },
    closeDocumentUpload: (state) => {
      state.isDocumentUploadOpen = false;
    },
    openProjectSettings: (state) => {
      state.isProjectSettingsOpen = true;
    },
    closeProjectSettings: (state) => {
      state.isProjectSettingsOpen = false;
    },
    // quick command menu
    openQuickCommandMenu: (state) => {
      state.isQuickCommandMenuOpen = true;
    },
    closeQuickCommandMenu: (state) => {
      state.isQuickCommandMenuOpen = false;
    },
    toggleQuickCommandMenu: (state) => {
      state.isQuickCommandMenuOpen = !state.isQuickCommandMenuOpen;
    },
  },
});

export const UIDialogActions = dialogSlice.actions;
export const dialogReducer = dialogSlice.reducer;
