import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import annoReducer from "../views/annotation/annoSlice";
import searchReducer from "../views/search/searchSlice";
import logbookReducer from "../views/logbook/logbookSlice";
import autologbookReducer from "../views/autologbook/autologbookSlice";
import settingsReducer from "../views/settings/settingsSlice";
import analysisReducer from "../views/analysis/analysisSlice";
import filterReducer from "../features/FilterDialog/filterSlice";
import annotatedSegmentsReducer from "../views/analysis/AnnotatedSegments/annotatedSegmentsSlice";
import storage from "redux-persist/lib/storage";
import { persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";

const persistConfig = {
  key: "root",
  storage: storage,
};

// store slices in local storage
const persistedSettingsReducer = persistReducer(persistConfig, settingsReducer);
const persistedAnnoReducer = persistReducer(persistConfig, annoReducer);

export const store = configureStore({
  reducer: {
    annotations: persistedAnnoReducer,
    analysis: analysisReducer,
    search: searchReducer,
    logbook: logbookReducer,
    autologbook: autologbookReducer,
    settings: persistedSettingsReducer,
    annotatedSegments: annotatedSegmentsReducer,
    filter: filterReducer,
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
