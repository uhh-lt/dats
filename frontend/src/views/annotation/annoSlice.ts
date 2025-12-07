import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { ProjectActions } from "../../components/Project/projectSlice.ts";
import { RootState } from "../../store/store.ts";
import AnnotationMode from "./AnnotationMode.ts";

export enum TagStyle {
  Inline = "inline",
  Above = "above",
  None = "none",
}
export interface AnnoState {
  // project state:
  selectedAnnotationId: number | undefined; // the annotation selected in the annotation explorer.
  selectedCodeId: number | undefined; // the code selected in the code explorer, used to compute which codes are shown in the annotation menu.
  hoveredCodeId: number | undefined; // the code hovered in the code explorer, used to compute highlightings.
  mostRecentCodeId: number | undefined; // the most recently applied code, it is always at the top of the annotation menu and the default code for new annotations.
  expandedCodeIds: string[]; // the code ids of the expanded codes in the code explorer.
  hiddenCodeIds: number[]; // the code ids of the hidden codes. Hidden codes are shown in the CodeExplorer, but are not rendered in the Annotator.
  visibleUserId: number | undefined; // the user id of the user whose annotations are shown in the Annotator.
  compareWithUserId: number | undefined; // the user id of the user whose annotations are shown in the Annotator.
  isCompareMode: boolean; // whether the Annotator is in comparison mode.
  // app state:
  annotationMode: AnnotationMode; // the annotation mode.
  tagStyle: TagStyle; // position of the tag in the Annotator.
}

const initialState: AnnoState = {
  // project state:
  selectedAnnotationId: undefined,
  selectedCodeId: undefined,
  hoveredCodeId: undefined,
  mostRecentCodeId: undefined,
  expandedCodeIds: [],
  hiddenCodeIds: [],
  visibleUserId: undefined,
  compareWithUserId: undefined,
  isCompareMode: false,
  // app state:
  annotationMode: AnnotationMode.Reader,
  tagStyle: TagStyle.Inline,
};

export const annoSlice = createSlice({
  name: "anno",
  initialState,
  reducers: {
    onChangeAnnotationMode: (state, action: PayloadAction<AnnotationMode>) => {
      if (action.payload !== undefined && action.payload !== null) {
        state.annotationMode = action.payload;
      }
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
    setSelectedAnnotationId: (state, action: PayloadAction<number | undefined>) => {
      state.selectedAnnotationId = action.payload;
    },
    setSelectedCodeId: (state, action: PayloadAction<number | undefined>) => {
      state.selectedCodeId = action.payload;
    },
    setHoveredCodeId: (state, action: PayloadAction<number | undefined>) => {
      state.hoveredCodeId = action.payload;
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
    setVisibleUserId: (state, action: PayloadAction<number>) => {
      // special case in comparison mode: swap visibleUserId and compareWithUserId
      if (state.isCompareMode && state.compareWithUserId === action.payload) {
        state.compareWithUserId = state.visibleUserId;
      }
      state.visibleUserId = action.payload;
    },
    moveCodeToTop: (state, action: PayloadAction<number>) => {
      state.mostRecentCodeId = action.payload;
    },
    onSetAnnotatorTagStyle: (state, action: PayloadAction<TagStyle>) => {
      if (action.payload !== undefined && action.payload !== null) {
        state.tagStyle = action.payload;
      }
    },
    compareWithUser: (state, action: PayloadAction<number>) => {
      console.log("compareWithUser", action.payload);
      console.log("visibleUserId", state.visibleUserId);
      // special case: swap visibleUserId and compareWithUserId
      if (state.isCompareMode && state.visibleUserId === action.payload) {
        state.visibleUserId = state.compareWithUserId;
      }
      state.compareWithUserId = action.payload;
      state.isCompareMode = true;
      state.annotationMode = AnnotationMode.SentenceAnnotation;
      console.log("compareWithUser", action.payload);
      console.log("visibleUserId", state.visibleUserId);
    },
    stopComparison: (state) => {
      state.compareWithUserId = undefined;
      state.isCompareMode = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'anno' state.");
      state.selectedAnnotationId = initialState.selectedAnnotationId;
      state.selectedCodeId = initialState.selectedCodeId;
      state.hoveredCodeId = initialState.hoveredCodeId;
      state.mostRecentCodeId = initialState.mostRecentCodeId;
      state.expandedCodeIds = initialState.expandedCodeIds;
      state.hiddenCodeIds = initialState.hiddenCodeIds;
      state.visibleUserId = initialState.visibleUserId;
      state.compareWithUserId = initialState.compareWithUserId;
      state.isCompareMode = initialState.isCompareMode;
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
