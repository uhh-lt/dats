import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import annoReducer from "../views/annotation/annoSlice";
import searchReducer from "../views/search/searchSlice";
import logbookReducer from "../views/logbook/logbookSlice";

export const store = configureStore({
  reducer: {
    annotations: annoReducer,
    search: searchReducer,
    logbook: logbookReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;
