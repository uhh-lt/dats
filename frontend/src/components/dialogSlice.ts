import { AlertProps } from "@mui/material";
import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { BBoxAnnotationReadResolved } from "../api/openapi/models/BBoxAnnotationReadResolved.ts";
import { CodeRead } from "../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../api/openapi/models/DocumentTagRead.ts";
import { LLMJobResult } from "../api/openapi/models/LLMJobResult.ts";
import { LLMJobType } from "../api/openapi/models/LLMJobType.ts";
import { LLMPromptTemplates } from "../api/openapi/models/LLMPromptTemplates.ts";
import { ProjectMetadataRead } from "../api/openapi/models/ProjectMetadataRead.ts";
import { SnackbarEvent } from "../components/SnackbarDialog/SnackbarEvent.ts";
import { CodeCreateSuccessHandler } from "./Code/CodeCreateDialog.tsx";
import { LLMAssistanceEvent } from "./LLMDialog/LLMEvent.ts";

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
  bboxAnnotation?: BBoxAnnotationReadResolved;
  // snackbar
  isSnackbarOpen: boolean;
  snackbarData: SnackbarEvent;
  // project settings
  isProjectSettingsOpen: boolean;
  // llm dialog
  isLLMDialogOpen: boolean;
  llmMethod?: LLMJobType;
  llmDocumentIds: number[];
  llmStep: number;
  llmTags: DocumentTagRead[];
  llmMetadata: ProjectMetadataRead[];
  llmCodes: CodeRead[];
  llmPrompts: LLMPromptTemplates[];
  llmJobId?: string;
  llmJobResult: LLMJobResult | null | undefined;
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
  // llm dialog
  isLLMDialogOpen: false,
  llmDocumentIds: [],
  llmMethod: undefined,
  llmStep: 0,
  llmTags: [],
  llmMetadata: [],
  llmCodes: [],
  llmPrompts: [],
  llmJobId: undefined,
  llmJobResult: undefined,
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
    openBBoxAnnotationEditDialog: (state, action: PayloadAction<{ annotation: BBoxAnnotationReadResolved }>) => {
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
    },
    openProjectSettings: (state) => {
      state.isProjectSettingsOpen = true;
    },
    closeProjectSettings: (state) => {
      state.isProjectSettingsOpen = false;
    },
    // Step 0: Select documents & open the dialog
    openLLMDialog: (state, action: PayloadAction<{ event: LLMAssistanceEvent }>) => {
      state.isLLMDialogOpen = true;
      state.llmDocumentIds = action.payload.event.selectedDocumentIds;
      state.llmMethod = action.payload.event.method;
      state.llmStep = action.payload.event.method === undefined ? 0 : 1;
    },
    // Step 1: Select method
    llmDialogGoToDataSelection: (state, action: PayloadAction<{ method: LLMJobType }>) => {
      state.llmMethod = action.payload.method;
      state.llmStep = 1;
    },
    // Step 2: Select tags, metadata, or codes
    llmDialogGoToPromptEditor: (
      state,
      action: PayloadAction<{
        prompts: LLMPromptTemplates[];
        tags: DocumentTagRead[];
        metadata: ProjectMetadataRead[];
        codes: CodeRead[];
      }>,
    ) => {
      state.llmStep = 2;
      state.llmPrompts = action.payload.prompts;
      state.llmTags = action.payload.tags;
      state.llmMetadata = action.payload.metadata;
      state.llmCodes = action.payload.codes;
    },
    // Step 3: Edit the prompts
    updateLLMPrompts: (
      state,
      action: PayloadAction<{ language: string; systemPrompt: string; userPrompt: string }>,
    ) => {
      const updatedPrompts = state.llmPrompts.map((prompt) => {
        if (prompt.language === action.payload.language) {
          return {
            ...prompt,
            system_prompt: action.payload.systemPrompt,
            user_prompt: action.payload.userPrompt,
          };
        }
        return prompt;
      });
      state.llmPrompts = updatedPrompts.slice();
    },
    llmDialogGoToWaiting: (state, action: PayloadAction<{ jobId: string; method: LLMJobType }>) => {
      state.isLLMDialogOpen = true;
      state.llmStep = 3;
      state.llmJobId = action.payload.jobId;
      state.llmMethod = action.payload.method;
    },
    // Step 4: Wait for the job to finish
    llmDialogGoToResult: (state, action: PayloadAction<{ result: LLMJobResult }>) => {
      state.llmJobResult = action.payload.result;
      state.llmStep = 4;
    },
    // close the dialog & reset
    closeLLMDialog: (state) => {
      state.isLLMDialogOpen = initialState.isLLMDialogOpen;
      state.llmDocumentIds = initialState.llmDocumentIds;
      state.llmMethod = initialState.llmMethod;
      state.llmStep = initialState.llmStep;
      state.llmTags = initialState.llmTags;
      state.llmMetadata = initialState.llmMetadata;
      state.llmCodes = initialState.llmCodes;
      state.llmPrompts = initialState.llmPrompts;
      state.llmJobId = initialState.llmJobId;
      state.llmJobResult = initialState.llmJobResult;
    },
    previousLLMDialogStep: (state) => {
      state.llmStep -= 1;
      if (state.llmStep < 0) {
        state.llmStep = 0;
      }
      // user just selected the method, reset method selection
      if (state.llmStep === 0) {
        state.llmMethod = initialState.llmMethod;
        // user just selected the data, reset data selection
      } else if (state.llmStep === 1) {
        state.llmPrompts = initialState.llmPrompts;
        state.llmTags = initialState.llmTags;
        state.llmMetadata = initialState.llmMetadata;
        state.llmCodes = initialState.llmCodes;
      }
    },
  },
});

export const CRUDDialogActions = dialogSlice.actions;
export default dialogSlice.reducer;
