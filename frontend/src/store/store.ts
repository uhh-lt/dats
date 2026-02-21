import { Action, ThunkAction, configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE } from "redux-persist";
import { bboxFilterReducer } from "../core/bbox-annotation/table/bboxFilterSlice.ts";
import { memoFilterReducer } from "../core/memo/table/memoFilterSlice.ts";
import { projectReducer } from "../core/project/projectSlice.ts";
import { seatFilterReducer } from "../core/sentence-annotation/table/seatFilterSlice.ts";
import { documentTableFilterReducer } from "../core/source-document/table/documentTableFilterSlice.ts";
import { satFilterReducer } from "../core/span-annotation/table/satFilterSlice.ts";
import { bboxAnnotationAnalysisReducer } from "../features/analysis/BBoxAnnotationAnalysis/bboxAnnotationAnalysisSlice.ts";
import { cotaReducer } from "../features/analysis/ConceptsOverTime/cotaSlice.ts";
import { sentAnnotationAnalysisReducer } from "../features/analysis/SentAnnotationAnalysis/sentAnnotationAnalysisSlice.ts";
import { spanAnnotationAnalysisReducer } from "../features/analysis/SpanAnnotationAnalysis/spanAnnotationAnalysisSlice.ts";
import { timelineAnalysisReducer } from "../features/analysis/TimelineAnalysis/timelineAnalysisSlice.ts";
import { wordFrequencyReducer } from "../features/analysis/WordFrequency/wordFrequencySlice.ts";
import { annoReducer } from "../features/annotation/annoSlice.ts";
import { logbookReducer } from "../features/logbook/logbookSlice.ts";
import { perspectivesReducer } from "../features/perspectives/perspectivesSlice.ts";
import { searchReducer } from "../features/search/DocumentSearch/searchSlice.ts";
import { imageSearchReducer } from "../features/search/ImageSearch/imageSearchSlice.ts";
import { sentenceSearchReducer } from "../features/search/SentenceSearch/sentenceSearchSlice.ts";
import { documentSamplerReducer } from "../features/tools/DocumentSampler/documentSamplerSlice.ts";
import { duplicateFinderReducer } from "../features/tools/DuplicateFinder/duplicateFinderSlice.ts";
import { layoutReducer } from "../layouts/layoutSlice.ts";
import { tabReducer } from "../layouts/TabBar/tabSlice.ts";
import { dialogReducer } from "./dialogSlice.ts";

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
