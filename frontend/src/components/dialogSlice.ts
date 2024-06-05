import { AlertProps } from "@mui/material";
import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { BBoxAnnotationReadResolvedCode } from "../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { CodeRead } from "../api/openapi/models/CodeRead.ts";
import { SnackbarEvent } from "../components/SnackbarDialog/SnackbarEvent.ts";
import { CodeCreateSuccessHandler } from "./Code/CodeCreateDialog.tsx";

interface DialogState {
  // tags
  isTagEditDialogOpen: boolean;
  isTagCreateDialogOpen: boolean;
  tagId?: number;
  tagName?: string;
  parentTagId?: number;
  // codes
  isCodeCreateDialogOpen: boolean;
  isCodeEditDialogOpen: boolean;
  codeName?: string;
  parentCodeId?: number;
  codeCreateSuccessHandler: CodeCreateSuccessHandler;
  code?: CodeRead;
  // span
  isSpanAnnotationEditDialogOpen: boolean;
  spanAnnotationIds: number[];
  // bbox
  isBBoxAnnotationEditDialogOpen: boolean;
  isBBoxAnnotationCreateDialogOpen: boolean;
  bboxAnnotation?: BBoxAnnotationReadResolvedCode;
  // snackbar
  isSnackbarOpen: boolean;
  snackbarData: SnackbarEvent;
  // project settings
  isProjectSettingsOpen: boolean;
}

const initialState: DialogState = {
  // tags
  isTagEditDialogOpen: false,
  isTagCreateDialogOpen: false,
  tagId: undefined,
  tagName: undefined,
  parentTagId: undefined,
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
  // bbox
  isBBoxAnnotationEditDialogOpen: false,
  isBBoxAnnotationCreateDialogOpen: false,
  bboxAnnotation: undefined,
  // snackbar
  isSnackbarOpen: false,
  snackbarData: {
    severity: "info",
    text: "",
    title: undefined,
  },
  // project settings
  isProjectSettingsOpen: false,
};

export const dialogSlice = createSlice({
  name: "dialog",
  initialState,
  reducers: {
    openSpanAnnotationEditDialog: (state, action: PayloadAction<{ spanAnnotationIds: number[] }>) => {
      state.isSpanAnnotationEditDialogOpen = true;
      state.spanAnnotationIds = action.payload.spanAnnotationIds;
    },
    closeSpanAnnotationEditDialog: (state) => {
      state.isSpanAnnotationEditDialogOpen = false;
      state.spanAnnotationIds = [];
    },
    openTagEditDialog: (state, action: PayloadAction<{ tagId: number }>) => {
      state.isTagEditDialogOpen = true;
      state.tagId = action.payload.tagId;
    },
    closeTagEditDialog: (state) => {
      state.isTagEditDialogOpen = false;
      state.tagId = undefined;
    },
    openTagCreateDialog: (state, action: PayloadAction<{ tagName?: string }>) => {
      state.isTagCreateDialogOpen = true;
      state.tagName = action.payload.tagName;
    },
    closeTagCreateDialog: (state) => {
      state.isTagCreateDialogOpen = false;
      state.tagName = undefined;
    },
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
    openBBoxAnnotationEditDialog: (state, action: PayloadAction<{ annotation: BBoxAnnotationReadResolvedCode }>) => {
      state.isBBoxAnnotationEditDialogOpen = true;
      state.bboxAnnotation = action.payload.annotation;
    },
    closeBBoxAnnotationEditDialog: (state) => {
      state.isBBoxAnnotationEditDialogOpen = false;
      state.bboxAnnotation = undefined;
    },
    openBBoxAnnotationCreateDialog: (state) => {
      state.isBBoxAnnotationCreateDialogOpen = true;
    },
    closeBBoxAnnotationCreateDialog: (state) => {
      state.isBBoxAnnotationCreateDialogOpen = false;
    },
    openSnackbar: (
      state,
      action: PayloadAction<{ severity: AlertProps["severity"]; text: string; title?: string }>,
    ) => {
      state.isSnackbarOpen = true;
      state.snackbarData = action.payload;
    },
    closeSnackbar: (state) => {
      state.isSnackbarOpen = false;
      state.snackbarData = initialState.snackbarData;
    },
    openProjectSettings: (state) => {
      state.isProjectSettingsOpen = true;
    },
    closeProjectSettings: (state) => {
      state.isProjectSettingsOpen = false;
    },
  },
});

export const CRUDDialogActions = dialogSlice.actions;
export default dialogSlice.reducer;
