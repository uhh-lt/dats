import { Action, ThunkAction, configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import bboxFilterReducer from "../components/BBoxAnnotation/BBoxAnnotationTable/bboxFilterSlice.ts";
import documentTableFilterReducer from "../components/SourceDocument/SdocTable/documentTableFilterSlice.ts";
import satFilterReducer from "../components/SpanAnnotation/SpanAnnotationTable/satFilterSlice.ts";
import dialogReducer from "../components/dialogSlice.ts";
import annotatedSegmentsReducer from "../views/analysis/AnnotatedSegments/annotatedSegmentsSlice.ts";
import cotaReducer from "../views/analysis/ConceptsOverTime/cotaSlice.ts";
import timelineAnalysisReducer from "../views/analysis/TimelineAnalysis/timelineAnalysisSlice.ts";
import wordFrequencyReducer from "../views/analysis/WordFrequency/wordFrequencySlice.ts";
import annoReducer from "../views/annotation/annoSlice.ts";
import logbookReducer from "../views/logbook/logbookSlice.ts";
import searchReducer from "../views/search/DocumentSearch/searchSlice.ts";
import imageSearchReducer from "../views/search/ImageSearch/imageSearchSlice.ts";
import sentenceSearchReducer from "../views/search/SentenceSearch/sentenceSearchSlice.ts";
import searchFilterReducer from "../views/search/searchFilterSlice.ts";
import autologbookReducer from "../views/tools/AutoLogbook/autologbookSlice.ts";
import documentSamplerReducer from "../views/tools/DocumentSampler/documentSamplerSlice.ts";

const persistConfig = {
  key: "root",
  storage: storage,
};

// store slices in local storage
const persistedAnnoReducer = persistReducer(persistConfig, annoReducer);

export const store = configureStore({
  reducer: {
    annotations: persistedAnnoReducer,
    search: searchReducer,
    imageSearch: imageSearchReducer,
    sentenceSearch: sentenceSearchReducer,
    logbook: logbookReducer,
    autologbook: autologbookReducer,
    annotatedSegments: annotatedSegmentsReducer,
    timelineAnalysis: timelineAnalysisReducer,
    searchFilter: searchFilterReducer,
    satFilter: satFilterReducer,
    bboxFilter: bboxFilterReducer,
    documentTableFilter: documentTableFilterReducer,
    wordFrequency: wordFrequencyReducer,
    cota: cotaReducer,
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
