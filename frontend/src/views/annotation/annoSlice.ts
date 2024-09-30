import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { ProjectActions } from "../../components/Project/projectSlice.ts";
import { RootState } from "../../store/store.ts";

export enum TagStyle {
  Inline = "inline",
  Above = "above",
  None = "none",
}
export interface AnnoState {
  // project state:
  selectedCodeId: number | undefined; // the code selected in the code explorer, used to compute which codes are shown in the annotation menu.
  mostRecentCodeId: number | undefined; // the most recently applied code, it is always at the top of the annotation menu and the default code for new annotations.
  expandedCodeIds: string[]; // the code ids of the expanded codes in the code explorer.
  hiddenCodeIds: number[]; // the code ids of the hidden codes. Hidden codes are shown in the CodeExplorer, but are not rendered in the Annotator.
  visibleUserIds: number[]; // the user ids of the users whose annotations are shown in the Annotator.
  // app state:
  disabledCodeIds: number[]; // the code ids of the disabled codes. Disabled codes are neither shown in the CodeExplorer nor in the Annotator.
  isAnnotationMode: boolean; // whether the Annotator is in annotation mode or in reader mode.
  tagStyle: TagStyle; // position of the tag in the Annotator.
}

const initialState: AnnoState = {
  // project state:
  selectedCodeId: undefined,
  mostRecentCodeId: undefined,
  expandedCodeIds: [],
  hiddenCodeIds: [],
  visibleUserIds: [],
  // app state:
  disabledCodeIds: [],
  isAnnotationMode: false,
  tagStyle: TagStyle.Inline,
};

export const annoSlice = createSlice({
  name: "anno",
  initialState,
  reducers: {
    onToggleAnnotationMode: (state) => {
      state.isAnnotationMode = !state.isAnnotationMode;
    },
    toggleCodeVisibility: (state, action: PayloadAction<number[]>) => {
      if (action.payload.length === 0) {
        return;
      }
      const codeId = action.payload[0];
      const hiddenCodeIds = state.hiddenCodeIds;
      if (hiddenCodeIds.indexOf(codeId) === -1) {
        // add codes
        action.payload.forEach((codeId) => {
          if (hiddenCodeIds.indexOf(codeId) === -1) {
            hiddenCodeIds.push(codeId);
          }
        });
      } else {
        // delete codes
        action.payload.forEach((codeId) => {
          const index = hiddenCodeIds.indexOf(codeId);
          if (index !== -1) {
            hiddenCodeIds.splice(index, 1);
          }
        });
      }
      state.hiddenCodeIds = hiddenCodeIds;
    },
    setSelectedCodeId: (state, action: PayloadAction<number | undefined>) => {
      state.selectedCodeId = action.payload;
    },
    setExpandedCodeIds: (state, action: PayloadAction<string[]>) => {
      state.expandedCodeIds = action.payload;
    },
    expandCodes: (state, action: PayloadAction<string[]>) => {
      for (const codeId of action.payload) {
        if (state.expandedCodeIds.indexOf(codeId) === -1) {
          state.expandedCodeIds.push(codeId);
        }
      }
    },
    setVisibleUserIds: (state, action: PayloadAction<number[]>) => {
      state.visibleUserIds = action.payload;
    },
    moveCodeToTop: (state, action: PayloadAction<CodeRead>) => {
      state.mostRecentCodeId = action.payload.id;
    },
    onSetAnnotatorTagStyle: (state, action: PayloadAction<TagStyle>) => {
      if (action.payload !== undefined && action.payload !== null) {
        state.tagStyle = action.payload;
      }
    },
    // code enable / disable
    disableCode: (state, action: PayloadAction<number>) => {
      const codeId = action.payload;
      const disabledCodeIds = state.disabledCodeIds;
      if (disabledCodeIds.indexOf(codeId) === -1) {
        disabledCodeIds.push(codeId);
        state.disabledCodeIds = disabledCodeIds;
      }
    },
    toggleCodeDisabled: (state, action: PayloadAction<number[]>) => {
      if (action.payload.length === 0) {
        return;
      }
      const codeId = action.payload[0];
      const disabledCodeIds = state.disabledCodeIds;
      if (disabledCodeIds.indexOf(codeId) === -1) {
        // add codes
        action.payload.forEach((codeId) => {
          if (disabledCodeIds.indexOf(codeId) === -1) {
            disabledCodeIds.push(codeId);
          }
        });
      } else {
        // delete codes
        action.payload.forEach((codeId) => {
          const index = disabledCodeIds.indexOf(codeId);
          if (index !== -1) {
            disabledCodeIds.splice(index, 1);
          }
        });
      }
      state.disabledCodeIds = disabledCodeIds;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'anno' state.");
      state.selectedCodeId = initialState.selectedCodeId;
      state.mostRecentCodeId = initialState.mostRecentCodeId;
      state.expandedCodeIds = initialState.expandedCodeIds;
      state.hiddenCodeIds = initialState.hiddenCodeIds;
      state.visibleUserIds = initialState.visibleUserIds;
    });
  },
});

export const AnnoActions = annoSlice.actions;

export const isHiddenCodeId = (codeId: number) => (state: RootState) =>
  state.annotations.hiddenCodeIds.indexOf(codeId) !== -1;

export default persistReducer(
  {
    key: "anno",
    storage,
  },
  annoSlice.reducer,
);
