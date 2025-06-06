import { AlertProps } from "@mui/material";
import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { ApproachRecommendation } from "../api/openapi/models/ApproachRecommendation.ts";
import { ApproachType } from "../api/openapi/models/ApproachType.ts";
import { CodeRead } from "../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../api/openapi/models/DocumentTagRead.ts";
import { LLMJobRead } from "../api/openapi/models/LLMJobRead.ts";
import { LLMJobResult } from "../api/openapi/models/LLMJobResult.ts";
import { LLMPromptTemplates } from "../api/openapi/models/LLMPromptTemplates.ts";
import { ProjectMetadataRead } from "../api/openapi/models/ProjectMetadataRead.ts";
import { TaskType } from "../api/openapi/models/TaskType.ts";
import { TrainingParameters } from "../api/openapi/models/TrainingParameters.ts";
import { SnackbarEvent } from "../components/SnackbarDialog/SnackbarEvent.ts";
import { CodeCreateSuccessHandler } from "./Code/CodeCreateDialog.tsx";
import { LLMAssistanceEvent } from "./LLMDialog/LLMEvent.ts";

interface DialogState {
  // tags
  isTagCreateDialogOpen: boolean;
  tagName?: string;
  isTagEditDialogOpen: boolean;
  tag?: DocumentTagRead;
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
  // snackbar
  isSnackbarOpen: boolean;
  snackbarData: SnackbarEvent;
  // project settings
  isProjectSettingsOpen: boolean;
  // llm dialog
  isLLMDialogOpen: boolean;
  llmProjectId: number;
  llmMethod?: TaskType;
  llmDocumentIds: number[];
  llmStep: number;
  llmTags: DocumentTagRead[];
  llmMetadata: ProjectMetadataRead[];
  llmCodes: CodeRead[];
  llmApproach: ApproachType;
  llmApproachRecommendation: ApproachRecommendation;
  llmDeleteExistingAnnotations: boolean;
  llmPrompts: LLMPromptTemplates[];
  llmParameters: TrainingParameters;
  llmJobId?: string;
  llmJobResult: LLMJobResult | null | undefined;
  // quick command menu
  isQuickCommandMenuOpen: boolean;
}

const initialState: DialogState = {
  // tags
  isTagEditDialogOpen: false,
  isTagCreateDialogOpen: false,
  tag: undefined,
  tagName: undefined,
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
  llmProjectId: -1,
  llmDocumentIds: [],
  llmMethod: undefined,
  llmStep: 0,
  llmTags: [],
  llmMetadata: [],
  llmCodes: [],
  llmApproach: ApproachType.LLM_ZERO_SHOT,
  llmApproachRecommendation: {
    available_approaches: {},
    recommended_approach: ApproachType.LLM_ZERO_SHOT,
    reasoning: "",
  },
  llmDeleteExistingAnnotations: false,
  llmPrompts: [],
  llmParameters: {
    batch_size: 1,
    max_epochs: 1,
    learning_rate: 1,
  },
  llmJobId: undefined,
  llmJobResult: undefined,
  // quick command menu
  isQuickCommandMenuOpen: false,
};

export const dialogSlice = createSlice({
  name: "dialog",
  initialState,
  reducers: {
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
    openTagEditDialog: (state, action: PayloadAction<{ tag: DocumentTagRead }>) => {
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
    // Step 0: Select documents -> Open the dialog
    openLLMDialog: (state, action: PayloadAction<{ event: LLMAssistanceEvent }>) => {
      state.isLLMDialogOpen = true;
      state.llmDocumentIds = action.payload.event.selectedDocumentIds;
      state.llmMethod = action.payload.event.method;
      state.llmStep = action.payload.event.method === undefined ? 0 : 1;
      state.llmProjectId = action.payload.event.projectId;
    },
    // Step 1: Select method -> Go to the data selection
    llmDialogGoToDataSelection: (state, action: PayloadAction<{ method: TaskType }>) => {
      state.llmMethod = action.payload.method;
      state.llmStep = 1;
    },
    // Step 2: Select tags, metadata, or codes -> Go to the model selection
    llmDialogGoToApproachSelection: (
      state,
      action: PayloadAction<{
        approach: ApproachRecommendation;
        tags: DocumentTagRead[];
        metadata: ProjectMetadataRead[];
        codes: CodeRead[];
      }>,
    ) => {
      state.llmStep = 2;
      state.llmApproachRecommendation = action.payload.approach;
      state.llmApproach = action.payload.approach.recommended_approach;
      state.llmTags = action.payload.tags;
      state.llmMetadata = action.payload.metadata;
      state.llmCodes = action.payload.codes;
    },
    // Step 3: Select the approach and deletion strategy (zero-shot, few-shot, or model training)
    // -> For zero-shot and few-shot, go to the prompt editor
    llmDialogGoToPromptEditor: (
      state,
      action: PayloadAction<{
        approach: ApproachType;
        prompts: LLMPromptTemplates[];
        deleteExistingAnnotations: boolean;
      }>,
    ) => {
      state.llmStep = 3;
      state.llmPrompts = action.payload.prompts;
      state.llmApproach = action.payload.approach;
      state.llmDeleteExistingAnnotations = action.payload.deleteExistingAnnotations;
    },
    llmDialogUpdatePromptEditor: (
      state,
      action: PayloadAction<{
        prompts: LLMPromptTemplates[];
      }>,
    ) => {
      state.llmStep = 3;
      state.llmPrompts = action.payload.prompts;
    },
    // -> For model training, go to the training parameters editor
    llmDialogGoToTrainingParameterEditor: (
      state,
      action: PayloadAction<{
        approach: ApproachType;
        trainingParameters: TrainingParameters;
      }>,
    ) => {
      state.llmStep = 3;
      state.llmApproach = action.payload.approach;
      state.llmParameters = action.payload.trainingParameters;
    },
    // Step 4 Variant A: Edit the prompts -> start the job & go to the waiting screen
    // Step 4 Variant B: Edit the trainingParameters -> start the job & go to the waiting screen
    llmDialogGoToWaiting: (
      state,
      action: PayloadAction<{
        jobId: string;
        trainingParameters?: TrainingParameters;
        prompts?: LLMPromptTemplates[];
      }>,
    ) => {
      state.isLLMDialogOpen = true;
      state.llmStep = 4;
      state.llmJobId = action.payload.jobId;
      if (action.payload.trainingParameters) {
        state.llmParameters = action.payload.trainingParameters;
      }
      if (action.payload.prompts) {
        state.llmPrompts = action.payload.prompts;
      }
    },
    // Step 4 Variant C: We click on View Results from Background Tasks
    llmDialogOpenFromBackgroundTask: (state, action: PayloadAction<LLMJobRead>) => {
      state.isLLMDialogOpen = true;
      state.llmStep = 4;

      state.llmProjectId = action.payload.parameters.project_id;
      state.llmJobId = action.payload.id;
      state.llmMethod = action.payload.parameters.llm_job_type;
      state.llmApproach = action.payload.parameters.llm_approach_type;
    },
    // Step 5: Wait for the job to finish
    llmDialogGoToResult: (state, action: PayloadAction<{ result: LLMJobResult }>) => {
      state.llmJobResult = action.payload.result;
      state.llmStep = 5;
    },
    // close the dialog & reset
    closeLLMDialog: (state) => {
      state.isLLMDialogOpen = initialState.isLLMDialogOpen;
      state.llmProjectId = initialState.llmProjectId;
      state.llmDocumentIds = initialState.llmDocumentIds;
      state.llmMethod = initialState.llmMethod;
      state.llmStep = initialState.llmStep;
      state.llmTags = initialState.llmTags;
      state.llmMetadata = initialState.llmMetadata;
      state.llmCodes = initialState.llmCodes;
      state.llmPrompts = initialState.llmPrompts;
      state.llmParameters = initialState.llmParameters;
      state.llmApproach = initialState.llmApproach;
      state.llmApproachRecommendation = initialState.llmApproachRecommendation;
      state.llmDeleteExistingAnnotations = initialState.llmDeleteExistingAnnotations;
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

export const CRUDDialogActions = dialogSlice.actions;
export default dialogSlice.reducer;
