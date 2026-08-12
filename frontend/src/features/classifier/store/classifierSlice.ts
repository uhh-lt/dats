import { ClassifierAveraging } from "@models/ClassifierAveraging";
import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierTask } from "@models/ClassifierTask";
import { ClassifierTrainingParams } from "@models/ClassifierTrainingParams";
import { ClassifierTrainingSettings as ClassifierTrainingSettingsDto } from "@models/ClassifierTrainingSettings";
import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";

export type ClassifierTrainingSettings = ClassifierTrainingSettingsDto &
  Pick<ClassifierTrainingParams, "classifier_name" | "base_name">;

interface ClassifierDialogContext {
  projectId: number;
  model?: ClassifierModel;
  task?: ClassifierTask;
  classifierId?: number;
}

interface ClassifierDatasetSelection {
  classIds: number[];
  sourceDocumentIds: number[];
  userIds: number[];
  tagIds: number[];
  mergeChildren: boolean;
}

interface ClassifierDialogDrafts {
  trainingSettings?: ClassifierTrainingSettings;
  evaluationAveraging?: ClassifierAveraging;
  inferenceKeepExisting: boolean;
}

interface ClassifierState {
  isOpen: boolean;
  step: number;
  context: ClassifierDialogContext;
  dataset: ClassifierDatasetSelection;
  drafts: ClassifierDialogDrafts;
  jobId?: string;
}

interface OpenClassifierDialogPayload {
  projectId: number;
  model: ClassifierModel;
  task: ClassifierTask;
  classifierId?: number;
  initialStep?: number;
  initialClassIds?: number[];
  initialSourceDocumentIds?: number[];
  mergeChildren?: boolean;
}

const createInitialState = (): ClassifierState => ({
  isOpen: false,
  step: 0,
  context: {
    projectId: -1,
  },
  dataset: {
    classIds: [],
    sourceDocumentIds: [],
    userIds: [],
    tagIds: [],
    mergeChildren: false,
  },
  drafts: {
    inferenceKeepExisting: true,
  },
  jobId: undefined,
});

const classifierSlice = createSlice({
  name: "classifier",
  initialState: createInitialState(),
  reducers: {
    openClassifierDialog: (_state, action: PayloadAction<OpenClassifierDialogPayload>) => {
      const state = createInitialState();
      state.isOpen = true;
      state.step = action.payload.initialStep ?? 0;
      state.context = {
        projectId: action.payload.projectId,
        model: action.payload.model,
        task: action.payload.task,
        classifierId: action.payload.classifierId,
      };
      state.dataset.classIds = action.payload.initialClassIds ?? [];
      state.dataset.sourceDocumentIds = action.payload.initialSourceDocumentIds ?? [];
      state.dataset.mergeChildren = action.payload.mergeChildren ?? false;
      return state;
    },
    closeClassifierDialog: () => createInitialState(),
    nextClassifierDialogStep: (state) => {
      state.step += 1;
    },
    previousClassifierDialogStep: (state) => {
      state.step = Math.max(0, state.step - 1);
    },
    setClassSelection: (
      state,
      action: PayloadAction<{
        classIds: number[];
        mergeChildren: boolean;
      }>,
    ) => {
      state.dataset.classIds = action.payload.classIds;
      state.dataset.mergeChildren = action.payload.mergeChildren;
    },
    setSourceDocumentIds: (state, action: PayloadAction<number[]>) => {
      state.dataset.sourceDocumentIds = action.payload;
    },
    setUserIds: (state, action: PayloadAction<number[]>) => {
      state.dataset.userIds = action.payload;
    },
    setTagIds: (state, action: PayloadAction<number[]>) => {
      state.dataset.tagIds = action.payload;
    },
    setMergeChildren: (state, action: PayloadAction<boolean>) => {
      state.dataset.mergeChildren = action.payload;
    },
    setTrainingSettings: (state, action: PayloadAction<ClassifierTrainingSettings>) => {
      state.drafts.trainingSettings = action.payload;
    },
    setEvaluationAveraging: (state, action: PayloadAction<ClassifierAveraging>) => {
      state.drafts.evaluationAveraging = action.payload;
    },
    setInferenceKeepExisting: (state, action: PayloadAction<boolean>) => {
      state.drafts.inferenceKeepExisting = action.payload;
    },
    setClassifierJobId: (state, action: PayloadAction<string>) => {
      state.jobId = action.payload;
    },
  },
});

export const ClassifierActions = classifierSlice.actions;
export const classifierReducer = { [classifierSlice.name]: classifierSlice.reducer };
