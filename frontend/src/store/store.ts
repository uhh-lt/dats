import { Action, ThunkAction, configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import bboxFilterReducer from "../components/BBoxAnnotationTable/bboxFilterSlice.ts";
import documentTableFilterReducer from "../components/DocumentTable/documentTableFilterSlice.ts";
import satFilterReducer from "../components/SpanAnnotationTable/satFilterSlice.ts";
import dialogReducer from "../features/CrudDialog/dialogSlice.ts";
import annotatedSegmentsReducer from "../views/analysis/AnnotatedSegments/annotatedSegmentsSlice.ts";
import documentSamplerReducer from "../views/analysis/DocumentSampler/documentSamplerSlice.ts";
import timelineAnalysisFilterReducer from "../views/analysis/TimelineAnalysis/timelineAnalysisFilterSlice.ts";
import timelineAnalysisReducer from "../views/analysis/TimelineAnalysis/timelineAnalysisSlice.ts";
import wordFrequencyFilterReducer from "../views/analysis/WordFrequency/wordFrequencyFilterSlice.ts";
import wordFrequencyReducer from "../views/analysis/WordFrequency/wordFrequencySlice.ts";
import analysisReducer from "../views/analysis/analysisSlice.ts";
import annoReducer from "../views/annotation/annoSlice.ts";
import autologbookReducer from "../views/autologbook/autologbookSlice.ts";
import logbookReducer from "../views/logbook/logbookSlice.ts";
import searchFilterReducer from "../views/search/searchFilterSlice.ts";
import searchReducer from "../views/search/searchSlice.ts";
import imageSearchReducer from "../views/searchimages/imageSearchSlice.ts";
import settingsReducer from "../views/settings/settingsSlice.ts";

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
    imageSearch: imageSearchReducer,
    logbook: logbookReducer,
    autologbook: autologbookReducer,
    settings: persistedSettingsReducer,
    annotatedSegments: annotatedSegmentsReducer,
    timelineAnalysis: timelineAnalysisReducer,
    searchFilter: searchFilterReducer,
    satFilter: satFilterReducer,
    bboxFilter: bboxFilterReducer,
    documentTableFilter: documentTableFilterReducer,
    timelineAnalysisFilter: timelineAnalysisFilterReducer,
    wordFrequency: wordFrequencyReducer,
    wordFrequencyFilter: wordFrequencyFilterReducer,
    dialog: dialogReducer,
    documentSampler: documentSamplerReducer,
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
