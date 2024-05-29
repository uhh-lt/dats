import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ActionTargetObjectType } from "../../api/openapi/models/ActionTargetObjectType.ts";
import { ActionType } from "../../api/openapi/models/ActionType.ts";

interface AutologbookState {
  visibleDays: number;
  userIds: number[];
  actionTypes: ActionType[];
  actionTargets: ActionTargetObjectType[];
  timestampFrom: number;
  timestampTo: number;
}

const initState: () => AutologbookState = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return {
    visibleDays: 7,
    userIds: [],
    actionTypes: [ActionType.CREATE, ActionType.UPDATE, ActionType.DELETE],
    actionTargets: Object.values(ActionTargetObjectType),
    timestampFrom: from.getTime(),
    timestampTo: to.getTime(),
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
});

// actions
export const AutologbookActions = autologbookSlice.actions;

export default autologbookSlice.reducer;
