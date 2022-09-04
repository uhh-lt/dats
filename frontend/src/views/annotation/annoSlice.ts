import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../store/store";
import { ICode } from "./TextAnnotator/ICode";

export interface AnnoState {
  codesForSelection: ICode[];
  selectedDocumentTagId: number | undefined;
  selectedCodeId: number | undefined;
  expandedCodeIds: string[];
  hiddenCodeIds: number[];
  visibleAdocIds: number[];
  visibleUserIds: number[] | undefined;
}

const initialState: AnnoState = {
  codesForSelection: [],
  selectedDocumentTagId: undefined,
  selectedCodeId: undefined,
  expandedCodeIds: [],
  hiddenCodeIds: [],
  visibleAdocIds: [],
  visibleUserIds: undefined,
};

export const annoSlice = createSlice({
  name: "anno",
  initialState,
  reducers: {
    setCodesForSelection: (state, action: PayloadAction<ICode[]>) => {
      state.codesForSelection = action.payload;
    },
    toggleCodeVisibility: (state, action: PayloadAction<number[]>) => {
      if (action.payload.length === 0) {
        return;
      }
      console.log(action.payload);
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
    setSelectedParentCodeId: (state, action: PayloadAction<number | undefined>) => {
      state.selectedCodeId = action.payload;
    },
    setExpandedParentCodeIds: (state, action: PayloadAction<string[]>) => {
      state.expandedCodeIds = action.payload;
    },
    setSelectedDocumentTagId: (state, action: PayloadAction<number | undefined>) => {
      state.selectedDocumentTagId = action.payload;
    },
    setVisibleAdocIds: (state, action: PayloadAction<number[]>) => {
      state.visibleAdocIds = action.payload;
    },
    setVisibleUserIds: (state, action: PayloadAction<number[]>) => {
      state.visibleUserIds = action.payload;
    },
  },
});

export const AnnoActions = annoSlice.actions;

export const isHiddenCodeId = (codeId: number) => (state: RootState) =>
  state.annotations.hiddenCodeIds.indexOf(codeId) !== -1;

export default annoSlice.reducer;
