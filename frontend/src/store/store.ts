import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import annoReducer from "../views/annotation/annoSlice";
import searchReducer from "../views/search/searchSlice";
import codeGraphReducer from "../views/analysis/CodeGraph/codeGraphSlice";
import logbookReducer from "../views/logbook/logbookSlice";
import autologbookReducer from "../views/autologbook/autologbookSlice";
import settingsReducer from "../views/settings/settingsSlice";
import storage from "redux-persist/lib/storage";
import { persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";

const persistConfig = {
  key: "root",
  storage: storage,
};

const persistedReducer = persistReducer(persistConfig, settingsReducer);

export const store = configureStore({
  reducer: {
    annotations: annoReducer,
    codeGraph: codeGraphReducer,
    search: searchReducer,
    logbook: logbookReducer,
    autologbook: autologbookReducer,
    settings: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;
