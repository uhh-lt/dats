import { ApproachRecommendation } from "@models/ApproachRecommendation";
import { ApproachType } from "@models/ApproachType";
import { DefaultStrategyParams } from "@models/DefaultStrategyParams";
import { FuzzyGroundingStrategyParams } from "@models/FuzzyGroundingStrategyParams";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { LLMAssistantJobOutput } from "@models/LLMAssistantJobOutput";
import { LLMAssistantPromptTemplates } from "@models/LLMAssistantPromptTemplates";
import { NERInlineTagStrategyParams } from "@models/NERInlineTagStrategyParams";
import { StrategyType } from "@models/StrategyType";
import { TaskType } from "@models/TaskType";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { LLMAssistantEvent } from "../_types/LLMAssistantEvent";

export type LLMAssistantStrategyParams =
  | DefaultStrategyParams
  | NERInlineTagStrategyParams
  | FuzzyGroundingStrategyParams;

interface LLMAssistantState {
  // dialog
  isDialogOpen: boolean;
  projectId: number;
  modelId: string;
  method?: TaskType;
  documentIds: number[];
  step: number;
  tagIds: number[];
  projectMetadataIds: number[];
  codeIds: number[];
  strategy?: StrategyType;
  strategyParams?: LLMAssistantStrategyParams;
  approach: ApproachType;
  approachRecommendation: ApproachRecommendation;
  deleteExistingAnnotations: boolean;
  prompts: LLMAssistantPromptTemplates[];
  jobId?: string;
  jobResult: LLMAssistantJobOutput | null | undefined;
}

const initialState: LLMAssistantState = {
  isDialogOpen: false,
  projectId: -1,
  documentIds: [],
  modelId: "default",
  method: undefined,
  step: 0,
  tagIds: [],
  projectMetadataIds: [],
  codeIds: [],
  strategy: undefined,
  strategyParams: undefined,
  approach: ApproachType.LLM_ZERO_SHOT,
  approachRecommendation: {
    available_approaches: {},
    recommended_approach: ApproachType.LLM_ZERO_SHOT,
    reasoning: "",
  },
  deleteExistingAnnotations: false,
  prompts: [],
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
      state.step = action.payload.method === undefined ? 0 : 1;
      state.projectId = action.payload.projectId;
    },
    // Step 1: Select method -> Go to the data selection
    goToDataSelection: (state, action: PayloadAction<{ method: TaskType }>) => {
      state.method = action.payload.method;
      state.step = 1;
    },
    // Step 2: Select tags, metadata, or codes -> Go to the settings form
    goToSettings: (
      state,
      action: PayloadAction<{
        approach: ApproachRecommendation;
        tagIds: number[];
        projectMetadataIds: number[];
        codeIds: number[];
      }>,
    ) => {
      state.step = 2;
      state.approachRecommendation = action.payload.approach;
      state.approach = action.payload.approach.recommended_approach;
      state.tagIds = action.payload.tagIds;
      state.projectMetadataIds = action.payload.projectMetadataIds;
      state.codeIds = action.payload.codeIds;
    },
    // Step 3: Save all settings and go to the prompt editor
    goToPromptEditor: (
      state,
      action: PayloadAction<{
        approach: ApproachType;
        prompts: LLMAssistantPromptTemplates[];
        deleteExistingAnnotations: boolean;
        modelId: string;
        strategy: StrategyType;
        strategyParams: LLMAssistantStrategyParams;
      }>,
    ) => {
      state.step = 3;
      state.prompts = action.payload.prompts;
      state.approach = action.payload.approach;
      state.deleteExistingAnnotations = action.payload.deleteExistingAnnotations;
      state.modelId = action.payload.modelId;
      state.strategy = action.payload.strategy;
      state.strategyParams = action.payload.strategyParams;
    },
    updatePromptEditor: (
      state,
      action: PayloadAction<{
        prompts: LLMAssistantPromptTemplates[];
      }>,
    ) => {
      state.step = 3;
      state.prompts = action.payload.prompts;
    },
    // Step 4 Variant A: Edit the prompts -> start the job & go to the waiting screen
    goToWaiting: (
      state,
      action: PayloadAction<{
        jobId: string;
        prompts: LLMAssistantPromptTemplates[];
      }>,
    ) => {
      state.isDialogOpen = true;
      state.step = 4;
      state.jobId = action.payload.jobId;
      state.prompts = action.payload.prompts;
    },
    // Step 4 Variant B: We click on View Results from Background Tasks
    openDialogFromBackgroundTask: (state, action: PayloadAction<LlmAssistantJobRead>) => {
      state.isDialogOpen = true;
      state.step = 4;

      state.projectId = action.payload.input.project_id;
      state.jobId = action.payload.job_id;
      state.method = action.payload.input.task_type;
      state.approach = action.payload.input.approach_type;
      state.strategy = action.payload.input.strategy_type;
      state.strategyParams = action.payload.input.specific_strategy_parameters;
    },
    // Step 5: Wait for the job to finish
    goToResult: (state, action: PayloadAction<{ result: LLMAssistantJobOutput }>) => {
      state.jobResult = action.payload.result;
      state.step = 5;
    },
    // close the dialog & reset
    closeDialog: (state) => {
      state.isDialogOpen = initialState.isDialogOpen;
      state.projectId = initialState.projectId;
      state.documentIds = initialState.documentIds;
      state.modelId = initialState.modelId;
      state.method = initialState.method;
      state.step = initialState.step;
      state.tagIds = initialState.tagIds;
      state.projectMetadataIds = initialState.projectMetadataIds;
      state.codeIds = initialState.codeIds;
      state.strategy = initialState.strategy;
      state.strategyParams = initialState.strategyParams;
      state.prompts = initialState.prompts;
      state.approach = initialState.approach;
      state.approachRecommendation = initialState.approachRecommendation;
      state.deleteExistingAnnotations = initialState.deleteExistingAnnotations;
      state.jobId = initialState.jobId;
      state.jobResult = initialState.jobResult;
    },
    previousDialogStep: (state) => {
      state.step -= 1;
      if (state.step < 0) {
        state.step = 0;
      }
      // user just selected the method, reset method selection
      if (state.step === 0) {
        state.method = initialState.method;
        // preserve the data choices for review and reset the downstream settings
      } else if (state.step === 1) {
        state.prompts = initialState.prompts;
        state.strategy = initialState.strategy;
        state.strategyParams = initialState.strategyParams;
        state.modelId = initialState.modelId;
        state.approach = initialState.approach;
        state.deleteExistingAnnotations = initialState.deleteExistingAnnotations;
        // preserve settings when returning from Edit prompt
      } else if (state.step === 2) {
        state.prompts = initialState.prompts;
      }
    },
  },
});

export const LLMAssistantActions = llmAssistantSlice.actions;
export const llmAssistantReducer = { [llmAssistantSlice.name]: llmAssistantSlice.reducer };
