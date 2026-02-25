import { Action, ThunkAction, configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE } from "redux-persist";

import { annoReducer } from "@features/annotation";
import { imageSearchReducer, searchReducer, sentenceSearchReducer } from "@features/search";
import { layoutReducer } from "./global/layoutSlice";
import { projectReducer } from "./global/projectSlice";
import { spanAnnotationAnalysisReducer } from "@features/span-annotation-analysis";
import { logbookReducer } from "@features/logbook";

export const store = configureStore({
  reducer: {
    // persisted reducers
    annotations: annoReducer,
    search: searchReducer,
    imageSearch: imageSearchReducer,
    sentenceSearch: sentenceSearchReducer,
    layout: layoutReducer,
    project: projectReducer,
    // non-persisted reducers
    tabs: tabReducer,
    logbook: logbookReducer,
    spanAnnotationAnalysis: spanAnnotationAnalysisReducer,
    sentAnnotationAnalysis: sentAnnotationAnalysisReducer,
    bboxAnnotationAnalysis: bboxAnnotationAnalysisReducer,
    timelineAnalysis: timelineAnalysisReducer,
    satFilter: satFilterReducer,
    seatFilter: seatFilterReducer,
    bboxFilter: bboxFilterReducer,
    memoFilter: memoFilterReducer,
    documentTableFilter: documentTableFilterReducer,
    wordFrequency: wordFrequencyReducer,
    cota: cotaReducer,
    dialog: dialogReducer,
    documentSampler: documentSamplerReducer,
    perspectives: perspectivesReducer,
    duplicateFinder: duplicateFinderReducer,
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
