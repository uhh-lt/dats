import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProjectActions } from "@store/global/projectSlice";
import { RootState } from "@store/store";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { AnnotationMode } from "../_types/AnnotationMode";
import { TagStyle } from "../_types/TagStyle";

export interface AnnoState {
  // project state:
  selectedCodeId: number | undefined; // the code selected in the code explorer, used to compute which codes are shown in the annotation menu.
  hoveredCodeId: number | undefined; // the code hovered in the code explorer, used to compute highlightings.
  mostRecentCodeId: number | undefined; // the most recently applied code, it is always at the top of the annotation menu and the default code for new annotations.
  expandedCodeIds: string[]; // the code ids of the expanded codes in the code explorer.
  hiddenCodeIds: number[]; // the code ids of the hidden codes. Hidden codes are shown in the CodeExplorer, but are not rendered in the Annotator.
  // app state:
  annotationMode: AnnotationMode; // the annotation mode.
  tagStyle: TagStyle; // position of the tag in the Annotator.
}

const initialState: AnnoState = {
  // project state:
  selectedCodeId: undefined,
  hoveredCodeId: undefined,
  mostRecentCodeId: undefined,
  expandedCodeIds: [],
  hiddenCodeIds: [],
  // app state:
  annotationMode: AnnotationMode.Reader,
  tagStyle: TagStyle.Inline,
};

const annoSlice = createSlice({
  name: "annotations",
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
    moveCodeToTop: (state, action: PayloadAction<number>) => {
      state.mostRecentCodeId = action.payload;
    },
    onSetAnnotatorTagStyle: (state, action: PayloadAction<TagStyle>) => {
      if (action.payload !== undefined && action.payload !== null) {
        state.tagStyle = action.payload;
      }
    },
    onDeleteCode: (state, action: PayloadAction<number>) => {
      // remove references to deleted code
      if (state.selectedCodeId === action.payload) {
        state.selectedCodeId = undefined;
      }
      if (state.mostRecentCodeId === action.payload) {
        state.mostRecentCodeId = undefined;
      }
      if (state.hoveredCodeId === action.payload) {
        state.hoveredCodeId = undefined;
      }
      if (state.expandedCodeIds.length > 0) {
        state.expandedCodeIds = state.expandedCodeIds.filter((id) => parseInt(id, 10) !== action.payload);
      }
      if (state.hiddenCodeIds.length > 0) {
        state.hiddenCodeIds = state.hiddenCodeIds.filter((id) => id !== action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(ProjectActions.changeProject, (state) => {
      console.log("Project changed! Resetting 'anno' state.");
      state.selectedCodeId = initialState.selectedCodeId;
      state.hoveredCodeId = initialState.hoveredCodeId;
      state.mostRecentCodeId = initialState.mostRecentCodeId;
      state.expandedCodeIds = initialState.expandedCodeIds;
      state.hiddenCodeIds = initialState.hiddenCodeIds;
    });
  },
});

export const AnnoActions = annoSlice.actions;

export const isHiddenCodeId = (codeId: number) => (state: RootState) =>
  state.annotations.hiddenCodeIds.indexOf(codeId) !== -1;

export const annoReducer = {
  [annoSlice.name]: persistReducer(
    {
      key: annoSlice.name,
      storage,
    },
    annoSlice.reducer,
  ),
};
