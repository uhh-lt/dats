import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ActionTargetObjectType } from "../../../api/openapi/models/ActionTargetObjectType.ts";
import { ActionType } from "../../../api/openapi/models/ActionType.ts";
import { ProjectActions } from "../../../components/Project/projectSlice.ts";

interface AutologbookState {
  // project state:
  userIds: number[];
  timestampFrom: number;
  timestampTo: number;
  // app state:
  actionTypes: ActionType[];
  actionTargets: ActionTargetObjectType[];
  visibleDays: number;
}

const initState: () => AutologbookState = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return {
    // project state:
    userIds: [],
    timestampFrom: from.getTime(),
    timestampTo: to.getTime(),
    // app state
    actionTypes: [ActionType.CREATE, ActionType.UPDATE, ActionType.DELETE],
    actionTargets: Object.values(ActionTargetObjectType),
    visibleDays: 7,
  };
};

const initialState: AutologbookState = initState();

export const autologbookSlice = createSlice({
  name: "autologbook",
  initialState,
  reducers: {
    toggleCreated: (state) => {
      const idx = state.actionTypes.indexOf(ActionType.CREATE);
      if (idx > -1) {
        state.actionTypes.splice(idx, 1);
      } else {
        state.actionTypes.push(ActionType.CREATE);
      }
    },
    toggleUpdated: (state) => {
      const idx = state.actionTypes.indexOf(ActionType.UPDATE);
      if (idx > -1) {
        state.actionTypes.splice(idx, 1);
      } else {
        state.actionTypes.push(ActionType.UPDATE);
      }
    },
    toggleDeleted: (state) => {
      const idx = state.actionTypes.indexOf(ActionType.DELETE);
      if (idx > -1) {
        state.actionTypes.splice(idx, 1);
      } else {
        state.actionTypes.push(ActionType.DELETE);
      }
    },
    setActionTypes: (state, action: PayloadAction<ActionType[]>) => {
      state.actionTypes = action.payload;
    },
    setUserIds: (state, action: PayloadAction<number[]>) => {
      state.userIds = action.payload;
    },
    setActionTargets: (state, action: PayloadAction<ActionTargetObjectType[]>) => {
      state.actionTargets = action.payload;
    },
    setVisibleDays: (state, action: PayloadAction<number>) => {
      state.visibleDays = action.payload;
      state.timestampFrom = state.timestampTo - (state.visibleDays - 1) * 24 * 60 * 60 * 1000;
    },
    setTimestampTo: (state, action: PayloadAction<number>) => {
      state.timestampTo = action.payload;
    },
    setTimestampFrom: (state, action: PayloadAction<number>) => {
      state.timestampFrom = action.payload;
    },
    prev: (state) => {
      state.timestampTo = state.timestampFrom - 24 * 60 * 60 * 1000;
      state.timestampFrom = state.timestampTo - (state.visibleDays - 1) * 24 * 60 * 60 * 1000;
    },
    next: (state) => {
      state.timestampFrom = state.timestampTo + 24 * 60 * 60 * 1000;
      state.timestampTo = state.timestampFrom + (state.visibleDays - 1) * 24 * 60 * 60 * 1000;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'autologbook' state.");
      state.userIds = initialState.userIds;
      state.timestampFrom = initialState.timestampFrom;
      state.timestampTo = initialState.timestampTo;
    });
  },
});

// actions
export const AutologbookActions = autologbookSlice.actions;

export default autologbookSlice.reducer;
