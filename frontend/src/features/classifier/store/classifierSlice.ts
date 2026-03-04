import { ClassifierModel } from "@api/models/ClassifierModel";
import { ClassifierTask } from "@api/models/ClassifierTask";
import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";

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
    onClassifierDialogSelectClasses: (state, action: PayloadAction<number[]>) => {
      state.classifierClassIds = action.payload;
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
    onClassifierDialogStartJob: (state, action: PayloadAction<string>) => {
      state.classifierJobId = action.payload;
      state.classifierStep += 1;
    },
    nextClassifierDialogStep: (state) => {
      state.classifierStep += 1;
    },
    previousClassifierDialogStep: (state) => {
      state.classifierStep -= 1;
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
      state.classifierJobId = initialState.classifierJobId;
    },
  },
});

export const ClassifierActions = classifierSlice.actions;
export const classifierReducer = classifierSlice.reducer;
