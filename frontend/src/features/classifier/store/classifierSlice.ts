import { ClassifierAveraging } from "@models/ClassifierAveraging";
import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierTask } from "@models/ClassifierTask";
import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";

export interface ClassifierTrainingSettings {
  classifierName: string;
  baseModelName: string;
  adapterName: string;
  batchSize: number;
  epochs: number;
  earlyStopping: boolean;
  learningRate: number;
  weightDecay: number;
  dropout: number;
  chunkSize: number;
  precision: "32-true" | "16-true" | "16-mixed" | "bf16-true" | "bf16-mixed";
  isBio: boolean;
  averaging: ClassifierAveraging;
}

export interface ClassifierEvaluationSettings {
  averaging: ClassifierAveraging;
}

interface ClassifierState {
  isClassifierDialogOpen: boolean;
  classifierProjectId: number;
  classifierModel?: ClassifierModel;
  classifierTask?: ClassifierTask;
  classifierId?: number;
  classifierStep: number;
  classifierClassIds: number[];
  classifierSdocIds: number[];
  classifierUserIds: number[];
  classifierTagIds: number[];
  classifierMergeChildren: boolean;
  classifierTrainingSettings?: ClassifierTrainingSettings;
  classifierEvaluationSettings?: ClassifierEvaluationSettings;
  classifierJobId?: string;
}

const initialState: ClassifierState = {
  isClassifierDialogOpen: false,
  classifierProjectId: -1,
  classifierModel: undefined,
  classifierTask: undefined,
  classifierId: undefined,
  classifierStep: 0,
  classifierClassIds: [],
  classifierSdocIds: [],
  classifierUserIds: [],
  classifierTagIds: [],
  classifierMergeChildren: false,
  classifierTrainingSettings: undefined,
  classifierEvaluationSettings: undefined,
  classifierJobId: undefined,
};

const classifierSlice = createSlice({
  name: "classifier",
  initialState,
  reducers: {
    openClassifierDialog: (
      state,
      action: PayloadAction<{
        projectId: number;
        classifierModel?: ClassifierModel;
        classifierTask?: ClassifierTask;
        classifierId?: number;
        classifierStep?: number;
        classifierClassIds?: number[];
        classifierSdocIds?: number[];
      }>,
    ) => {
      state.isClassifierDialogOpen = true;
      state.classifierProjectId = action.payload.projectId;
      state.classifierModel = action.payload.classifierModel;
      state.classifierTask = action.payload.classifierTask;
      state.classifierId = action.payload.classifierId;
      state.classifierStep = action.payload.classifierStep || 0;
      state.classifierClassIds = action.payload.classifierClassIds || [];
      state.classifierSdocIds = action.payload.classifierSdocIds || [];
    },
    onClassifierDialogSelectClasses: (
      state,
      action: PayloadAction<{
        classIds: number[];
        mergeChildren: boolean;
      }>,
    ) => {
      state.classifierClassIds = action.payload.classIds;
      state.classifierMergeChildren = action.payload.mergeChildren;
      state.classifierStep += 1;
    },
    onClassifierDialogSelectSdocs: (state, action: PayloadAction<number[]>) => {
      state.classifierSdocIds = action.payload;
      state.classifierStep += 1;
    },
    onClassifierDialogSelectAnnotators: (state, action: PayloadAction<number[]>) => {
      state.classifierUserIds = action.payload;
    },
    onClassifierDialogSelectTags: (state, action: PayloadAction<number[]>) => {
      state.classifierTagIds = action.payload;
    },
    onClassifierDialogSetTrainingSettings: (state, action: PayloadAction<ClassifierTrainingSettings>) => {
      state.classifierTrainingSettings = action.payload;
      state.classifierStep += 1;
    },
    onClassifierDialogSetEvaluationSettings: (state, action: PayloadAction<ClassifierEvaluationSettings>) => {
      state.classifierEvaluationSettings = action.payload;
      state.classifierStep += 1;
    },
    onClassifierDialogStartJob: (state, action: PayloadAction<string>) => {
      state.classifierJobId = action.payload;
      state.classifierStep += 1;
    },
    nextClassifierDialogStep: (state) => {
      state.classifierStep += 1;
    },
    previousClassifierDialogStep: (state) => {
      state.classifierStep -= 1;
      if (state.classifierStep < 0) {
        state.classifierStep = 0;
      }
      if (state.classifierStep === 0) {
        state.classifierClassIds = initialState.classifierClassIds;
        state.classifierMergeChildren = initialState.classifierMergeChildren;
        state.classifierSdocIds = initialState.classifierSdocIds;
        state.classifierUserIds = initialState.classifierUserIds;
        state.classifierTagIds = initialState.classifierTagIds;
      }
    },
    closeClassifierDialog: (state) => {
      state.isClassifierDialogOpen = initialState.isClassifierDialogOpen;
      state.classifierProjectId = initialState.classifierProjectId;
      state.classifierModel = initialState.classifierModel;
      state.classifierTask = initialState.classifierTask;
      state.classifierId = initialState.classifierId;
      state.classifierStep = initialState.classifierStep;
      state.classifierUserIds = initialState.classifierUserIds;
      state.classifierSdocIds = initialState.classifierSdocIds;
      state.classifierTagIds = initialState.classifierTagIds;
      state.classifierClassIds = initialState.classifierClassIds;
      state.classifierTrainingSettings = initialState.classifierTrainingSettings;
      state.classifierEvaluationSettings = initialState.classifierEvaluationSettings;
      state.classifierJobId = initialState.classifierJobId;
    },
  },
});

export const ClassifierActions = classifierSlice.actions;
export const classifierReducer = { [classifierSlice.name]: classifierSlice.reducer };
