import { DocumentUnit } from "@models/DocumentUnit";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { LLMAssistantJobOutput } from "@models/LLMAssistantJobOutput";
import { OutputFormat } from "@models/OutputFormat";
import { PromptLanguage } from "@models/PromptLanguage";
import { PromptSettings } from "@models/PromptSettings";
import { TaskType } from "@models/TaskType";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { LLMAssistantEvent } from "../_types/LLMAssistantEvent";

/**
 * How the wizard gets its prompt:
 * - guided: the user selects codes, tags or metadata fields and settings; the wizard runs the default prompt of the
 *   task with these selections, without storing it
 * - template: the user runs a stored prompt template version, which decides everything but the documents and model
 */
export type LLMAssistantMode = "guided" | "template";

interface LLMAssistantState {
  // dialog
  isDialogOpen: boolean;
  projectId: number;
  mode: LLMAssistantMode;
  method?: TaskType;
  documentIds: number[];
  step: number;
  modelId: string;
  // guided mode: the selections and settings of the default prompt
  tagIds: number[];
  projectMetadataIds: number[];
  codeIds: number[];
  language: PromptLanguage;
  outputFormat?: OutputFormat;
  documentUnit?: DocumentUnit;
  settings?: PromptSettings;
  // template mode: the version to run
  promptTemplateVersionId?: number;
  deleteExistingAnnotations: boolean;
  jobId?: string;
  jobResult: LLMAssistantJobOutput | null | undefined;
}

const initialState: LLMAssistantState = {
  isDialogOpen: false,
  projectId: -1,
  mode: "guided",
  documentIds: [],
  modelId: "default",
  method: undefined,
  step: 0,
  tagIds: [],
  projectMetadataIds: [],
  codeIds: [],
  language: PromptLanguage.EN,
  outputFormat: undefined,
  documentUnit: undefined,
  settings: undefined,
  promptTemplateVersionId: undefined,
  deleteExistingAnnotations: false,
  jobId: undefined,
  jobResult: undefined,
};

const llmAssistantSlice = createSlice({
  name: "llmAssistant",
  initialState,
  reducers: {
    // Step 0: Select documents -> Open the dialog
    openDialog: (state, action: PayloadAction<LLMAssistantEvent>) => {
      state.isDialogOpen = true;
      state.documentIds = action.payload.selectedDocumentIds;
      state.method = action.payload.method;
      state.mode = "guided";
      state.step = action.payload.method === undefined ? 0 : 1;
      state.projectId = action.payload.projectId;
    },
    // Step 1 (guided): Select method -> Go to the data selection
    goToDataSelection: (state, action: PayloadAction<{ method: TaskType }>) => {
      state.mode = "guided";
      state.method = action.payload.method;
      state.step = 1;
    },
    // Step 1 (template): Run a prompt template -> Go to the template selection
    goToTemplateSelection: (state) => {
      state.mode = "template";
      state.method = undefined;
      state.step = 1;
    },
    // Step 2 (guided): Select tags, metadata, or codes -> Go to the settings form
    goToSettings: (
      state,
      action: PayloadAction<{
        tagIds: number[];
        projectMetadataIds: number[];
        codeIds: number[];
      }>,
    ) => {
      state.step = 2;
      state.tagIds = action.payload.tagIds;
      state.projectMetadataIds = action.payload.projectMetadataIds;
      state.codeIds = action.payload.codeIds;
    },
    // Step 2 (template): Select a prompt template version -> Go to the settings form
    goToTemplateSettings: (state, action: PayloadAction<{ promptTemplateVersionId: number; method: TaskType }>) => {
      state.step = 2;
      state.promptTemplateVersionId = action.payload.promptTemplateVersionId;
      state.method = action.payload.method;
    },
    // Step 3: Save all settings and go to the review of the prompt
    goToReview: (
      state,
      action: PayloadAction<{
        modelId: string;
        language?: PromptLanguage;
        outputFormat?: OutputFormat;
        documentUnit?: DocumentUnit;
        settings?: PromptSettings;
      }>,
    ) => {
      state.step = 3;
      state.modelId = action.payload.modelId;
      state.language = action.payload.language ?? state.language;
      state.outputFormat = action.payload.outputFormat;
      state.documentUnit = action.payload.documentUnit;
      state.settings = action.payload.settings;
    },
    // Step 4 Variant A: Start the job & go to the waiting screen
    goToWaiting: (state, action: PayloadAction<{ jobId: string; deleteExistingAnnotations: boolean }>) => {
      state.isDialogOpen = true;
      state.step = 4;
      state.jobId = action.payload.jobId;
      state.deleteExistingAnnotations = action.payload.deleteExistingAnnotations;
    },
    // Step 4 Variant B: We click on View Results from Background Tasks
    openDialogFromBackgroundTask: (state, action: PayloadAction<LlmAssistantJobRead>) => {
      state.isDialogOpen = true;
      state.step = 4;

      state.projectId = action.payload.input.project_id;
      state.jobId = action.payload.job_id;
      state.method = action.payload.input.task_type;
      state.mode = action.payload.input.prompt_template_version_id ? "template" : "guided";
      state.promptTemplateVersionId = action.payload.input.prompt_template_version_id ?? undefined;
    },
    // Step 5: Wait for the job to finish
    goToResult: (state, action: PayloadAction<{ result: LLMAssistantJobOutput }>) => {
      state.jobResult = action.payload.result;
      state.step = 5;
    },
    // close the dialog & reset
    closeDialog: () => initialState,
    previousDialogStep: (state) => {
      state.step = Math.max(0, state.step - 1);
      // back to the start: nothing is chosen
      if (state.step === 0) {
        state.method = initialState.method;
        state.mode = initialState.mode;
        state.promptTemplateVersionId = initialState.promptTemplateVersionId;
      }
      // the data or template choice is kept for review; the settings are reset
      if (state.step <= 1) {
        state.modelId = initialState.modelId;
        state.outputFormat = initialState.outputFormat;
        state.documentUnit = initialState.documentUnit;
        state.settings = initialState.settings;
        state.deleteExistingAnnotations = initialState.deleteExistingAnnotations;
      }
    },
  },
});

export const LLMAssistantActions = llmAssistantSlice.actions;
export const llmAssistantReducer = { [llmAssistantSlice.name]: llmAssistantSlice.reducer };
