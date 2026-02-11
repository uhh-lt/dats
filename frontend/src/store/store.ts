import { Action, ThunkAction, configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE } from "redux-persist";
import bboxFilterReducer from "../components/BBoxAnnotation/BBoxAnnotationTable/bboxFilterSlice.ts";
import dialogReducer from "../components/dialogSlice.ts";
import memoFilterReducer from "../components/Memo/MemoTable/memoFilterSlice.ts";
import projectReducer from "../components/Project/projectSlice.ts";
import seatFilterReducer from "../components/SentenceAnnotation/SentenceAnnotationTable/seatFilterSlice.ts";
import documentTableFilterReducer from "../components/SourceDocument/SdocTable/documentTableFilterSlice.ts";
import satFilterReducer from "../components/SpanAnnotation/SpanAnnotationTable/satFilterSlice.ts";
import treeSortOrderReducer from "../components/TreeExplorer/treeSortOrderSlice.ts";
import layoutReducer from "../layouts/layoutSlice.ts";
import tabReducer from "../layouts/TabBar/tabSlice.ts";
import bboxAnnotationAnalysisReducer from "../views/analysis/BBoxAnnotationAnalysis/bboxAnnotationAnalysisSlice.ts";
import cotaReducer from "../views/analysis/ConceptsOverTime/cotaSlice.ts";
import sentAnnotationAnalysisReducer from "../views/analysis/SentAnnotationAnalysis/sentAnnotationAnalysisSlice.ts";
import spanAnnotationAnalysisReducer from "../views/analysis/SpanAnnotationAnalysis/spanAnnotationAnalysisSlice.ts";
import timelineAnalysisReducer from "../views/analysis/TimelineAnalysis/timelineAnalysisSlice.ts";
import wordFrequencyReducer from "../views/analysis/WordFrequency/wordFrequencySlice.ts";
import annoReducer from "../views/annotation/annoSlice.ts";
import logbookReducer from "../views/logbook/logbookSlice.ts";
import perspectivesReducer from "../views/perspectives/perspectivesSlice.ts";
import searchReducer from "../views/search/DocumentSearch/searchSlice.ts";
import imageSearchReducer from "../views/search/ImageSearch/imageSearchSlice.ts";
import sentenceSearchReducer from "../views/search/SentenceSearch/sentenceSearchSlice.ts";
import documentSamplerReducer from "../views/tools/DocumentSampler/documentSamplerSlice.ts";
import duplicateFinderReducer from "../views/tools/DuplicateFinder/duplicateFinderSlice.ts";

export const store = configureStore({
  reducer: {
    // persisted reducers
    annotations: annoReducer,
    search: searchReducer,
    imageSearch: imageSearchReducer,
    sentenceSearch: sentenceSearchReducer,
    layout: layoutReducer,
    project: projectReducer,
    treeSortOrder: treeSortOrderReducer, // global slice, not reset on project change
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
