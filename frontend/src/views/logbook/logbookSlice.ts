import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";

interface LogbookState {
  searchTerm: string;
  categories: AttachedObjectType[];
  starred: boolean;
}

const initialState: LogbookState = {
  searchTerm: "",
  categories: Object.values(AttachedObjectType),
  starred: false,
};

export const logbookSlice = createSlice({
  name: "logbook",
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setCategories: (state, action: PayloadAction<AttachedObjectType[]>) => {
      state.categories = action.payload;
    },
    toggleCategory: (state, action: PayloadAction<AttachedObjectType>) => {
      const index = state.categories.indexOf(action.payload);
      if (index > -1) {
        state.categories.splice(index, 1);
      } else {
        state.categories.push(action.payload);
      }
    },
    toggleStarred: (state) => {
      state.starred = !state.starred;
    },
  },
});

// actions
export const LogbookActions = logbookSlice.actions;

export default logbookSlice.reducer;
