import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AutologbookState {
  year: number;
  week: number;
  day: number;
  visibleUserIds: number[];
  visibleEntityIds: number[];
  // Filters
  showCreated: boolean;
  showUpdated: boolean;
  showDeleted: boolean;
  userFilter: number[];
  entityFilter: number[] | undefined;
}

export const getWeekNumber = (date: Date) => {
  let year = date.getFullYear();
  let startDate: Date = new Date(year, 0, 1);
  let days = Math.floor((date.getTime() - startDate.getTime()) / 86400000);
  return Math.ceil(days / 7);
};

const numWeeksinYear: (year: number) => number = (year) => {
  let d = new Date(year, 11, 31);
  let week = getWeekNumber(d);
  return week === 1 ? 52 : week;
};

export const getDateOfISOWeek: (week: number, year: number) => Date = (week, year) => {
  let simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  let dow = simple.getDay();
  let ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
};

export const getWeekDates: (weekStart: Date) => Date[] = (weekStart) => {
  let days: Date[] = new Array<Date>(7).fill(new Date()).map(() => new Date(weekStart.getTime()));
  days.forEach((day, index) => day.setDate(day.getDate() + index));
  return days;
};

const initState: () => AutologbookState = () => {
  let now = new Date();
  return {
    year: now.getFullYear(),
    week: getWeekNumber(now),
    day: now.getDate(),
    visibleUserIds: [],
    visibleEntityIds: [],
    // Filters
    showCreated: true,
    showUpdated: true,
    showDeleted: true,
    userFilter: [],
    entityFilter: undefined,
  };
};

const initialState: AutologbookState = initState();

export const autologbookSlice = createSlice({
  name: "autologbook",
  initialState,
  reducers: {
    setYear: (state, action: PayloadAction<number>) => {
      if (state.week > 51) {
        let maxWeeks = numWeeksinYear(state.year);
        if (state.week > maxWeeks) {
          state.week = maxWeeks;
        }
      }
      state.year = action.payload;
    },
    setWeek: (state, action: PayloadAction<number>) => {
      let newWeek = action.payload;
      if (state.week > 51) {
        let maxWeeks = numWeeksinYear(state.year);
        if (state.week > maxWeeks) {
          state.week = maxWeeks;
          return;
        }
      }
      state.week = newWeek;
    },
    setDay: (state, action: PayloadAction<number>) => {
      state.day = action.payload;
    },
    nextWeek: (state) => {
      let newWeek = state.week + 1;
      if (newWeek > 51) {
        let maxWeek = numWeeksinYear(state.year);
        if (newWeek > maxWeek) {
          state.year = state.year + 1;
          state.week = 1;
          return;
        }
      }
      state.week = newWeek;
    },
    prevWeek: (state) => {
      let newWeek = state.week - 1;
      if (newWeek <= 0) {
        let newYear = state.year - 1;
        newWeek = numWeeksinYear(newYear);
        state.year = newYear;
        state.week = newWeek;
      } else {
        state.week = newWeek;
      }
    },
    setVisibleUserIds: (state, action: PayloadAction<number[]>) => {
      state.visibleUserIds = action.payload;
    },
    setVisibleEntityIds: (state, action: PayloadAction<number[]>) => {
      state.visibleEntityIds = action.payload;
    },
    toggleCreated: (state) => {
      state.showCreated = !state.showCreated;
    },
    toggleUpdated: (state) => {
      state.showUpdated = !state.showUpdated;
    },
    toggleDeleted: (state) => {
      state.showDeleted = !state.showDeleted;
    },
    setUserFilter: (state, action: PayloadAction<number[]>) => {
      state.userFilter = action.payload;
    },
    setEntityFilter: (state, action: PayloadAction<number[]>) => {
      state.entityFilter = action.payload;
    },
  },
});

// actions
export const AutologbookActions = autologbookSlice.actions;

export default autologbookSlice.reducer;
