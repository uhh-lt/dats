import { Action, ThunkAction, configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import annotatedSegmentsFilterReducer from "../views/analysis/AnnotatedSegments/annotatedSegmentsFilterSlice";
import annotatedSegmentsReducer from "../views/analysis/AnnotatedSegments/annotatedSegmentsSlice";
import timelineAnalysisFilterReducer from "../views/analysis/TimelineAnalysis/timelineAnalysisFilterSlice";
import timelineAnalysisReducer from "../views/analysis/TimelineAnalysis/timelineAnalysisSlice";
import analysisReducer from "../views/analysis/analysisSlice";
import annoReducer from "../views/annotation/annoSlice";
import autologbookReducer from "../views/autologbook/autologbookSlice";
import logbookReducer from "../views/logbook/logbookSlice";
import searchFilterReducer from "../views/search/searchFilterSlice";
import searchReducer from "../views/search/searchSlice";
import settingsReducer from "../views/settings/settingsSlice";

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
    timelineAnalysis: timelineAnalysisReducer,
    searchFilter: searchFilterReducer,
    annotatedSegmentsFilter: annotatedSegmentsFilterReducer,
    timelineAnalysisFilter: timelineAnalysisFilterReducer,
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
