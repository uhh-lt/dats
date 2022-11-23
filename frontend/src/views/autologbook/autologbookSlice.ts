import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AutologbookState {
  year: number;
  week: number;
}

const getWeekNumber = (date: Date) => {
  let year = date.getFullYear();
  let startDate: Date = new Date(year, 0, 1);
  let days = Math.floor((date.getTime() - startDate.getTime()) / 86400000);
  return Math.ceil(days / 7);
}

const initState: () => AutologbookState = () => {
  let now = new Date();
  return {
    year: now.getFullYear(),
    week: getWeekNumber(now),
  }
}

const initialState: AutologbookState = initState();

export const autologbookSlice = createSlice({
  name: "autologbook",
  initialState,
  reducers: {
    setYear: (state, action: PayloadAction<number>) => {
      state.year = action.payload;
    },
    setWeek: (state, action: PayloadAction<number>) => {
      state.week = action.payload;
    },
  },
});

// actions
export const AutologbookActions = autologbookSlice.actions;

export default autologbookSlice.reducer;
