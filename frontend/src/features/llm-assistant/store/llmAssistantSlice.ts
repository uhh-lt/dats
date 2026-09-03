import { ApproachRecommendation } from "@models/ApproachRecommendation";
import { ApproachType } from "@models/ApproachType";
import { CodeRead } from "@models/CodeRead";
import { DefaultStrategyParams } from "@models/DefaultStrategyParams";
import { FuzzyGroundingStrategyParams } from "@models/FuzzyGroundingStrategyParams";
import { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import { LLMJobOutput } from "@models/LLMJobOutput";
import { LLMPromptTemplates } from "@models/LLMPromptTemplates";
import { NERInlineTagStrategyParams } from "@models/NERInlineTagStrategyParams";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { StrategyType } from "@models/StrategyType";
import { TagRead } from "@models/TagRead";
import { TaskType } from "@models/TaskType";
import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { LLMAssistantEvent } from "../_types/LLMAssistantEvent";

export type LLMStrategyParams = DefaultStrategyParams | NERInlineTagStrategyParams | FuzzyGroundingStrategyParams;

interface LLMAssistantState {
  // llm dialog
  isLLMDialogOpen: boolean;
  llmProjectId: number;
  llmId: string;
  llmMethod?: TaskType;
  llmDocumentIds: number[];
  llmStep: number;
  llmTags: TagRead[];
  llmMetadata: ProjectMetadataRead[];
  llmCodes: CodeRead[];
  llmStrategy?: StrategyType;
  llmStrategyParams?: LLMStrategyParams;
  llmApproach: ApproachType;
  llmApproachRecommendation: ApproachRecommendation;
  llmDeleteExistingAnnotations: boolean;
  llmPrompts: LLMPromptTemplates[];
  llmJobId?: string;
  llmJobResult: LLMJobOutput | null | undefined;
}

const initialState: LLMAssistantState = {
  isLLMDialogOpen: false,
  llmProjectId: -1,
  llmDocumentIds: [],
  llmId: "default",
  llmMethod: undefined,
  llmStep: 0,
  llmTags: [],
  llmMetadata: [],
  llmCodes: [],
  llmStrategy: undefined,
  llmStrategyParams: undefined,
  llmApproach: ApproachType.LLM_ZERO_SHOT,
  llmApproachRecommendation: {
    available_approaches: {},
    recommended_approach: ApproachType.LLM_ZERO_SHOT,
    reasoning: "",
  },
  llmDeleteExistingAnnotations: false,
  llmPrompts: [],
  llmJobId: undefined,
  llmJobResult: undefined,
};

const llmAssistantSlice = createSlice({
  name: "llmAssistant",
  initialState,
  reducers: {
    // Step 0: Select documents -> Open the dialog
    openLLMAssistant: (state, action: PayloadAction<LLMAssistantEvent>) => {
      state.isLLMDialogOpen = true;
      state.llmDocumentIds = action.payload.selectedDocumentIds;
      state.llmMethod = action.payload.method;
      state.llmStep = action.payload.method === undefined ? 0 : 1;
      state.llmProjectId = action.payload.projectId;
    },
    // Step 1: Select method -> Go to the data selection
    llmDialogGoToDataSelection: (state, action: PayloadAction<{ method: TaskType }>) => {
      state.llmMethod = action.payload.method;
      state.llmStep = 1;
    },
    // Step 2: Select tags, metadata, or codes -> Go to the settings form
    llmDialogGoToSettings: (
      state,
      action: PayloadAction<{
        approach: ApproachRecommendation;
        tags: TagRead[];
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
    // Step 3: Save all settings and go to the prompt editor
    llmDialogGoToPromptEditor: (
      state,
      action: PayloadAction<{
        approach: ApproachType;
        prompts: LLMPromptTemplates[];
        deleteExistingAnnotations: boolean;
        modelId: string;
        strategy: StrategyType;
        strategyParams: LLMStrategyParams;
      }>,
    ) => {
      state.llmStep = 3;
      state.llmPrompts = action.payload.prompts;
      state.llmApproach = action.payload.approach;
      state.llmDeleteExistingAnnotations = action.payload.deleteExistingAnnotations;
      state.llmId = action.payload.modelId;
      state.llmStrategy = action.payload.strategy;
      state.llmStrategyParams = action.payload.strategyParams;
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
    // Step 4 Variant A: Edit the prompts -> start the job & go to the waiting screen
    llmDialogGoToWaiting: (
      state,
      action: PayloadAction<{
        jobId: string;
        prompts: LLMPromptTemplates[];
      }>,
    ) => {
      state.isLLMDialogOpen = true;
      state.llmStep = 4;
      state.llmJobId = action.payload.jobId;
      state.llmPrompts = action.payload.prompts;
    },
    // Step 4 Variant B: We click on View Results from Background Tasks
    llmDialogOpenFromBackgroundTask: (state, action: PayloadAction<LlmAssistantJobRead>) => {
      state.isLLMDialogOpen = true;
      state.llmStep = 4;

      state.llmProjectId = action.payload.input.project_id;
      state.llmJobId = action.payload.job_id;
      state.llmMethod = action.payload.input.llm_job_type;
      state.llmApproach = action.payload.input.llm_approach_type;
      state.llmStrategy = action.payload.input.llm_strategy_type;
      state.llmStrategyParams = action.payload.input.specific_strategy_parameters;
    },
    // Step 5: Wait for the job to finish
    llmDialogGoToResult: (state, action: PayloadAction<{ result: LLMJobOutput }>) => {
      state.llmJobResult = action.payload.result;
      state.llmStep = 5;
    },
    // close the dialog & reset
    closeLLMDialog: (state) => {
      state.isLLMDialogOpen = initialState.isLLMDialogOpen;
      state.llmProjectId = initialState.llmProjectId;
      state.llmDocumentIds = initialState.llmDocumentIds;
      state.llmId = initialState.llmId;
      state.llmMethod = initialState.llmMethod;
      state.llmStep = initialState.llmStep;
      state.llmTags = initialState.llmTags;
      state.llmMetadata = initialState.llmMetadata;
      state.llmCodes = initialState.llmCodes;
      state.llmStrategy = initialState.llmStrategy;
      state.llmStrategyParams = initialState.llmStrategyParams;
      state.llmPrompts = initialState.llmPrompts;
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
        // preserve the data choices for review and reset the downstream settings
      } else if (state.llmStep === 1) {
        state.llmPrompts = initialState.llmPrompts;
        state.llmStrategy = initialState.llmStrategy;
        state.llmStrategyParams = initialState.llmStrategyParams;
        state.llmId = initialState.llmId;
        state.llmApproach = initialState.llmApproach;
        state.llmDeleteExistingAnnotations = initialState.llmDeleteExistingAnnotations;
        // preserve settings when returning from Edit prompt
      } else if (state.llmStep === 2) {
        state.llmPrompts = initialState.llmPrompts;
      }
    },
  },
});

export const LLMAssistantActions = llmAssistantSlice.actions;
export const llmAssistantReducer = { [llmAssistantSlice.name]: llmAssistantSlice.reducer };
