import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CodeGraphState {
  codesGraphSelection: any[];
}

const initialState: CodeGraphState = {
  codesGraphSelection: [],
};

export const codeGraphSlice = createSlice({
  name: "codeGraph",
  initialState,
  reducers: {
    setCodeGraphSelection: (state, action: PayloadAction<any>) => {
      state.codesGraphSelection = action.payload;
    },
  },
});

// actions
export const CodeGraphActions = codeGraphSlice.actions;
export default codeGraphSlice.reducer;
