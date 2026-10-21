/* eslint-disable boundaries/element-types */
// This file configures the Redux store for the application, combining reducers from various features and core modules.
// Hence, it is expected to have imports from many different parts of the codebase, which is why the boundaries rule is disabled here.

import { bboxFilterReducer } from "@core/bbox-annotation";
import { memoFilterReducer } from "@core/memo";
import { tabsReducer } from "@core/navigation";
import { confirmationReducer, snackbarReducer } from "@core/notification";
import { seatFilterReducer } from "@core/sentence-annotation";
import { documentTableFilterReducer } from "@core/source-document";
import { satFilterReducer } from "@core/span-annotation";
import { annotationsReducer, codeShortcutsReducer } from "@features/annotation";
import { bboxAnnotationAnalysisReducer } from "@features/bbox-annotation-analysis";
import { classifierReducer } from "@features/classifier";
import { cotaReducer } from "@features/concept-over-time-analysis";
import { documentSamplerReducer } from "@features/document-sampler";
import { duplicateFinderReducer } from "@features/duplicate-finder";
import { healthReducer } from "@features/health";
import { llmAssistantReducer } from "@features/llm-assistant";
import { memoWorkspaceReducer } from "@features/memo-workspace";
import { perspectivesReducer } from "@features/perspectives";
import { imageSearchReducer, documentSearchReducer, sentenceSearchReducer } from "@features/search";
import { sentAnnotationAnalysisReducer } from "@features/sent-annotation-analysis";
import { spanAnnotationAnalysisReducer } from "@features/span-annotation-analysis";
import { timelineAnalysisReducer } from "@features/timeline-analysis";
import { wordFrequencyReducer } from "@features/word-frequency-analysis";
import { Action, ThunkAction, configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE } from "redux-persist";
import { dialogBusReducer } from "./global/dialogBusSlice";
import { layoutReducer } from "./global/layoutSlice";
import { projectReducer } from "./global/projectSlice";
import { websocketReducer } from "./global/websocketSlice";

export const store = configureStore({
  reducer: {
    ...annotationsReducer,
    ...codeShortcutsReducer,
    ...documentSearchReducer,
    ...imageSearchReducer,
    ...sentenceSearchReducer,
    ...layoutReducer,
    ...projectReducer,
    ...tabsReducer,
    ...snackbarReducer,
    ...confirmationReducer,
    ...classifierReducer,
    ...llmAssistantReducer,
    ...memoWorkspaceReducer,
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
    ...dialogBusReducer,
    ...websocketReducer,
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
