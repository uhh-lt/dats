// QueryKey governance rules:
// 1) Every QueryKey must have exactly one canonical query definition site
//    (`useQuery`, `queryOptions`, or `infiniteQueryOptions` with `queryFn`).
// 2) All other places must reuse the canonical options instead of redefining `queryKey` + `queryFn`.
// 3) The `managed by` comment must point to the canonical definition path.
// 4) If a key is temporarily defined in multiple places, list every path in one comment with `and`.
// 5) Cache WRITES (setQueryData/removeQueries/invalidateQueries in response to entity
//    changes) are centralized in frontend/src/api/cache-sync/brain.ts — mutations tag
//    `meta.datsEvent`, websocket events forward there. Do not write entity caches elsewhere.
export const QueryKey = {
  // the instance info (no parameters)
  // managed by frontend/src/api/hooks/GeneralHooks.ts
  INSTANCE_INFO: "instanceInfo",

  // GitHub release notes (by release tag)
  // managed by frontend/src/features/whats-new/WhatsNewDialog.tsx
  GITHUB_RELEASE: "githubRelease",

  // memo search views (by project id)
  // managed by frontend/src/api/hooks/MemoViewHooks.ts
  MEMO_VIEWS: "memoViews",
  // span annotation search views (by project id)
  // managed by frontend/src/api/hooks/SpanAnnoViewHooks.ts
  SPAN_ANNO_VIEWS: "spanAnnoViews",
  // sentence annotation search views (by project id)
  // managed by frontend/src/api/hooks/SentenceAnnoViewHooks.ts
  SENTENCE_ANNO_VIEWS: "sentenceAnnoViews",
  // bbox annotation search views (by project id)
  // managed by frontend/src/api/hooks/BBoxAnnoViewHooks.ts
  BBOX_ANNO_VIEWS: "bboxAnnoViews",

  // CodeFrequency[] (by project id, user ids, code ids, doc types)
  // managed by frontend/src/features/code-frequency-analysis/_api/codeFrequencyAnalysisQueryOptions.ts
  ANALYSIS_CODE_FREQUENCIES: "analysisCodeFrequencies",
  // CodeOccurrence[] (by project id, user ids, code id)
  // managed by frontend/src/features/code-frequency-analysis/_api/codeFrequencyAnalysisQueryOptions.ts
  ANALYSIS_CODE_OCCURRENCES: "analysisCodeOccurrences",

  // A single aspect (by aspect id)
  // managed by NO_QUERY_DEFINITION_FOUND (add one canonical query definition site)
  ASPECT: "aspect",

  // managed by frontend/src/api/hooks/StatisticsHooks.ts
  FILTER_ENTITY_STATISTICS: "filterEntityStatistics",
  // managed by frontend/src/api/hooks/StatisticsHooks.ts
  FILTER_KEYWORD_STATISTICS: "filterKeywordStatistics",
  // managed by frontend/src/api/hooks/StatisticsHooks.ts
  FILTER_TAG_STATISTICS: "filterTagStatistics",

  // managed by frontend/src/api/hooks/AnnoscalingHooks.ts
  ANNOSCALING_SUGGEST: "annoscalingSuggest",

  // the columns (string[]) for a doctype (by doctype)
  // managed by frontend/src/features/health/_api/healthQueryOptions.ts
  SDOC_HEALTH_TABLE_COLUMNS: "sdocHealthTableColumns",
  // sdoc health of a project (by project id, doctype)
  // managed by frontend/src/features/health/_api/healthQueryOptions.ts
  SDOC_HEALTH_TABLE: "sdocHealthTable",

  // tables
  // managed by frontend/src/features/search/views/document-search/_api/documentSearchQueryOptions.ts
  SEARCH_TABLE: "search-document-table-data",
  // managed by frontend/src/core/source-document/table/SdocFilterTable.tsx
  SDOC_TABLE: "document-table-data",
  // managed by frontend/src/core/span-annotation/table/SpanAnnotationFilterTable.tsx
  SPAN_ANNO_TABLE: "span-annotation-table-data",
  // managed by frontend/src/core/bbox-annotation/table/BBoxAnnotationFilterTable.tsx
  BBOX_TABLE: "bbox-annotation-table-data",
  // managed by frontend/src/core/sentence-annotation/table/SentenceAnnotationFilterTable.tsx
  SENT_ANNO_TABLE: "sentence-annotation-table-data",
  // managed by frontend/src/features/word-frequency-analysis/_api/wordFrequencyAnalysisQueryOptions.ts
  WORD_FREQUENCY_TABLE: "wordfrequency-table-data",

  // search
  // managed by frontend/src/features/search/views/image-search/_api/imageSimilaritySearchQueryOptions.ts
  IMG_SIMSEARCH: "image-similarity-search",
  // managed by frontend/src/features/search/views/sentence-search/_api/sentenceSimilaritySearchQueryOptions.ts
  SENT_SIMSEARCH: "sentence-similarity-search",

  // table info (by filterSliceName, projectId) (info about the columns and their types)
  // managed by frontend/src/features/timeline-analysis/views/analysis/_components/useInitTimelineAnalysisFilterSlice.ts
  TABLE_INFO: "tableInfo",

  // the available models (no parameters)
  // managed by frontend/src/api/hooks/LLMHooks.ts
  AVAILABLE_LLMS: "availableLLMs",
  // the available strategies for an llm task (by task type)
  // managed by frontend/src/api/hooks/LLMHooks.ts
  LLM_STRATEGIES: "llmStrategies",
};
