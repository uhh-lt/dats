import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { BBoxAnnotationReadResolvedCode } from "../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { CodeCreateSuccessHandler } from "./Code/CodeCreateDialog.tsx";

interface DialogState {
  isTagEditDialogOpen: boolean;
  isTagCreateDialogOpen: boolean;
  tagId: number;
  tagName?: string;
  parentTagId?: number;
  isCodeCreateDialogOpen: boolean;
  isCodeEditDialogOpen: boolean;
  codeName?: string;
  parentCodeId?: number;
  codeCreateSuccessHandler: CodeCreateSuccessHandler;
  code?: CodeRead;
  isSpanAnnotationEditDialogOpen: boolean;
  spanAnnotationIds: number[];
  isBBoxAnnotationEditDialogOpen: boolean;
  isBBoxAnnotationCreateDialogOpen: boolean;
  bboxAnnotation?: BBoxAnnotationReadResolvedCode;
}

const initialState: DialogState = {
  // tags
  isTagEditDialogOpen: false,
  isTagCreateDialogOpen: false,
  tagId: -1,
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
      state.tagId = -1;
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
  },
});

export const CRUDDialogActions = dialogSlice.actions;
export default dialogSlice.reducer;
