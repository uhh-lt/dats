/* eslint-disable boundaries/element-types */
// This file configures the Redux store for the application, combining reducers from various features and core modules.
// Hence, it is expected to have imports from many different parts of the codebase, which is why the boundaries rule is disabled here.

import { bboxFilterReducer } from "@core/bbox-annotation";
import { memoDialogReducer, memoFilterReducer } from "@core/memo";
import { tabReducer } from "@core/navigation";
import { confirmationReducer, snackbarReducer } from "@core/notification";
import { seatFilterReducer } from "@core/sentence-annotation";
import { documentTableFilterReducer } from "@core/source-document";
import { satFilterReducer } from "@core/span-annotation";
import { annoReducer } from "@features/annotation";
import { bboxAnnotationAnalysisReducer } from "@features/bbox-annotation-analysis";
import { classifierReducer } from "@features/classifier";
import { cotaReducer } from "@features/concept-over-time-analysis";
import { documentSamplerReducer } from "@features/document-sampler";
import { duplicateFinderReducer } from "@features/duplicate-finder";
import { healthReducer } from "@features/health";
import { llmAssistantReducer } from "@features/llm-assistant";
import { logbookReducer } from "@features/logbook";
import { perspectivesReducer } from "@features/perspectives";
import { imageSearchReducer, searchReducer, sentenceSearchReducer } from "@features/search";
import { sentAnnotationAnalysisReducer } from "@features/sent-annotation-analysis";
import { spanAnnotationAnalysisReducer } from "@features/span-annotation-analysis";
import { timelineAnalysisReducer } from "@features/timeline-analysis";
import { wordFrequencyReducer } from "@features/word-frequency-analysis";
import { Action, ThunkAction, configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE } from "redux-persist";
import { dialogBusReducer } from "./global/dialogBusSlice";
import { layoutReducer } from "./global/layoutSlice";
import { projectReducer } from "./global/projectSlice";

export const store = configureStore({
  reducer: {
    // persisted reducers
    ...annoReducer,
    ...searchReducer,
    ...imageSearchReducer,
    ...sentenceSearchReducer,
    ...layoutReducer,
    ...projectReducer,
    // non-persisted reducers
    ...memoDialogReducer,
    ...snackbarReducer,
    ...confirmationReducer,
    ...classifierReducer,
    ...llmAssistantReducer,
    ...tabReducer,
    ...logbookReducer,
    ...spanAnnotationAnalysisReducer,
    ...sentAnnotationAnalysisReducer,
    ...bboxAnnotationAnalysisReducer,
    ...timelineAnalysisReducer,
    ...satFilterReducer,
    ...seatFilterReducer,
    ...bboxFilterReducer,
    ...memoFilterReducer,
    ...documentTableFilterReducer,
    ...wordFrequencyReducer,
    ...cotaReducer,
    ...documentSamplerReducer,
    ...perspectivesReducer,
    ...duplicateFinderReducer,
    ...healthReducer,
    // dialog bus
    ...dialogBusReducer,
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
