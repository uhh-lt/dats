import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import annoReducer from "../views/annotation/annoSlice";
import searchReducer from "../views/search/searchSlice";

export const store = configureStore({
  reducer: {
    annotations: annoReducer,
    search: searchReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;
