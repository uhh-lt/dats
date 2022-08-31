import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface LogbookState {
  searchTerm: string;
  category: string | undefined;
}

const initialState: LogbookState = {
  searchTerm: "",
  category: undefined,
};

export const logbookSlice = createSlice({
  name: "logbook",
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setCategory: (state, action: PayloadAction<string | undefined>) => {
      state.category = action.payload;
    },
  },
});

// actions
export const LogbookActions = logbookSlice.actions;

export default logbookSlice.reducer;
