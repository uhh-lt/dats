// QueryKey governance rules:
// 1) Every QueryKey must have exactly one canonical query definition site
//    (`useQuery`, `queryOptions`, or `infiniteQueryOptions` with `queryFn`).
// 2) All other places must reuse the canonical options instead of redefining `queryKey` + `queryFn`.
// 3) The `managed by` comment must point to the canonical definition path.
// 4) If a key is temporarily defined in multiple places, list every path in one comment with `and`.
export const QueryKey = {
  // the logged-in user (by access token)
  // managed by frontend/src/core/auth/provider/AuthProvider.tsx
  ME: "me",

  // the instance info (no parameters)
  // managed by frontend/src/api/hooks/GeneralHooks.ts
  INSTANCE_INFO: "instanceInfo",

  // all UserRead[] of a Project (by project id)
  // managed by frontend/src/api/hooks/UserHooks.ts
  PROJECT_USERS: "projectUsers",

  // CodeMap of a Project (by project id)
  // managed by frontend/src/api/hooks/CodeHooks.ts
  PROJECT_CODES: "projectCodes",

  // all TagRead[] of a Project (by project id)
  // managed by frontend/src/api/hooks/TagHooks.ts
  PROJECT_TAGS: "projectTags",
  // all TagRead Ids of a SourceDocument (by sdoc id)
  // managed by frontend/src/api/hooks/TagHooks.ts
  SDOC_TAGS: "sdocTags",
  // Record[docTagId, docTagCount] of SourceDocuments (by project id, sdoc ids)
  // managed by frontend/src/api/hooks/TagHooks.ts
  TAG_SDOC_COUNT: "sdocTagCount",

  // all ProjectRead[] of the logged-in user (no parameters)
  // managed by frontend/src/api/hooks/ProjectHooks.ts
  USER_PROJECTS: "userProjects",
  // count (int) of SourceDocuments with SDocStatus (by project id, sdoc status)
  // managed by frontend/src/api/hooks/ProjectHooks.ts
  PROJECT_SDOC_STATUS_COUNT: "projectSdocStatusCount",

  // a single SourceDocumentRead (by sdoc id)
  // managed by frontend/src/api/hooks/SdocHooks.ts
  SDOC: "sdoc",
  // a single SourceDocumentDataRead (by sdoc id)
  // managed by frontend/src/api/hooks/SdocHooks.ts
  SDOC_DATA: "sdocData",
  // id of a single SourceDocument (by project id and filename)
  // managed by frontend/src/api/hooks/SdocHooks.ts
  SDOC_ID: "sdocId",
  // sdoc ids of a document that are in the same folder (by sdoc id)
  // managed by frontend/src/api/hooks/SdocHooks.ts
  SDOC_SAME_FOLDER: "sdocSameFolder",
  // thumbnail url of a document (by sdoc id)
  // managed by frontend/src/api/hooks/SdocHooks.ts
  SDOC_THUMBNAIL_URL: "sdocThumbnailURL",
  // all SourceDocument ids tagged with the given tag (by tag id)
  // managed by frontend/src/api/hooks/SdocHooks.ts
  SDOC_IDS_BY_TAG_ID: "sdocIdsByTagId",
  // annotators (user ids) of a document (by sdoc id)
  // managed by frontend/src/api/hooks/SdocHooks.ts
  SDOC_ANNOTATORS: "sdocAnnotators",

  // a single MemoRead (by memo id)
  // managed by frontend/src/api/hooks/MemoHooks.ts
  MEMO: "memo",
  // a single MemoRead of the logged in user (by attachedObjectType, attachedObjectId)
  // managed by frontend/src/api/hooks/MemoHooks.ts
  USER_MEMO: "userMemo",
  // all MemoRead[] of the attached object (by attachedObjectType, attachedObjectId)
  // managed by frontend/src/api/hooks/MemoHooks.ts
  OBJECT_MEMOS: "objectMemos",

  // a single SpanAnnotationRead (by span annotation id)
  // managed by frontend/src/api/hooks/SpanAnnotationHooks.ts
  SPAN_ANNOTATION: "annotation",
  // SpanAnnotationRead[] of a code of the logged-in user (by code id)
  // managed by frontend/src/api/hooks/SpanAnnotationHooks.ts
  SPAN_ANNOTATIONS_USER_CODE: "annotationsUserCode",
  // SpanAnnotationRead[] (by sdoc id, user id)
  // managed by frontend/src/api/hooks/SpanAnnotationHooks.ts
  SDOC_SPAN_ANNOTATIONS: "sdocSpanAnnotations",

  // a single BBoxAnnotationRead (by bbox annotation id)
  // managed by frontend/src/api/hooks/BboxAnnotationHooks.ts
  BBOX_ANNOTATION: "bboxAnnotation",
  // BBoxAnnotationRead[] of a code of the logged-in user (by code id)
  // managed by frontend/src/api/hooks/BboxAnnotationHooks.ts
  BBOX_ANNOTATIONS_USER_CODE: "bboxAnnotationsUserCode",
  // BBoxAnnotationRead[] of a document (by sdoc id, user id)
  // managed by frontend/src/api/hooks/BboxAnnotationHooks.ts
  SDOC_BBOX_ANNOTATIONS: "sdocBBoxAnnotations",

  // a single SentenceAnnotationRead (by sentence annotation id)
  // managed by frontend/src/api/hooks/SentenceAnnotationHooks.ts
  SENTENCE_ANNOTATION: "sentenceAnnotation",
  // SentenceAnnotator of a document (by sdoc id, user id)
  // managed by frontend/src/api/hooks/SentenceAnnotationHooks.ts
  SDOC_SENTENCE_ANNOTATOR: "sdocSentenceAnnotator",

  // WhiteboardMap of a project (by project id)
  // managed by frontend/src/features/whiteboard/_api/whiteboardQueryOptions.ts
  PROJECT_WHITEBOARDS: "projectWhiteboards",

  // TimelineMap of a project (by project id)
  // managed by frontend/src/features/timeline-analysis/_api/timelineAnalysisQueryOptions.ts
  PROJECT_TIMELINE_ANALYSIS: "projectTimelineAnalysis",

  // CodeFrequency[] (by project id, user ids, code ids, doc types)
  // managed by frontend/src/features/code-frequency-analysis/_api/codeFrequencyAnalysisQueryOptions.ts
  ANALYSIS_CODE_FREQUENCIES: "analysisCodeFrequencies",
  // CodeOccurrence[] (by project id, user ids, code id)
  // managed by frontend/src/features/code-frequency-analysis/_api/codeFrequencyAnalysisQueryOptions.ts
  ANALYSIS_CODE_OCCURRENCES: "analysisCodeOccurrences",

  // CotaMap of a project (by project id)
  // managed by frontend/src/features/concept-over-time-analysis/_api/cotaQueryOptions.ts
  PROJECT_COTAS: "projectCotas",
  // COTARefinementJobRead (by cotaRefinementJob id)
  // managed by frontend/src/features/concept-over-time-analysis/_api/cotaQueryOptions.ts
  COTA_REFINEMENT_JOB: "cotaRefinementJob",

  // ProjectMetadataMap of a Project (by project id)
  // managed by frontend/src/api/hooks/MetadataHooks.ts
  PROJECT_METADATAS: "projectMetadatas",
  // SdocMetadataMap of a SourceDocument (by sdoc id)
  // managed by frontend/src/api/hooks/MetadataHooks.ts
  SDOC_METADATAS: "sdocMetadatas",
  // SourceDocumentMetadataRead with given key of a document (by sdoc id, metadata key)
  // managed by frontend/src/api/hooks/MetadataHooks.ts
  SDOC_METADATA_BY_KEY: "sdocMetadataByKey",

  // Aspects of a Project (by project id)
  // managed by frontend/src/features/perspectives/_api/perspectivesQueryOptions.ts
  PROJECT_ASPECTS: "projectAspects",
  // A single aspect (by aspect id)
  // managed by NO_QUERY_DEFINITION_FOUND (add one canonical query definition site)
  ASPECT: "aspect",
  // A single Perspectives Job (by perspectives job id)
  // managed by frontend/src/features/perspectives/_api/perspectivesQueryOptions.ts
  PERSPECTIVES_JOB: "perspectivesJob",
  // A DocumentVisualization (by aspect id)
  // managed by frontend/src/features/perspectives/_api/perspectivesQueryOptions.ts
  DOCUMENT_VISUALIZATION: "documentVisualization",
  // ClusterSimilarities (by aspect id)
  // managed by frontend/src/features/perspectives/_api/perspectivesQueryOptions.ts
  CLUSTER_SIMILARITIES: "clusterSimilarities",
  // Cluster of a SourceDocument (by aspect id, sdoc id)
  // managed by frontend/src/features/perspectives/_api/perspectivesQueryOptions.ts
  SDOC_CLUSTES: "sdocClusters",
  // Document Aspect content (by aspect id, sdoc id)
  // managed by frontend/src/features/perspectives/_api/perspectivesQueryOptions.ts
  SDOC_ASPECT_CONTENT: "sdocAspectContent",

  // managed by frontend/src/api/hooks/StatisticsHooks.ts
  FILTER_ENTITY_STATISTICS: "filterEntityStatistics",
  // managed by frontend/src/api/hooks/StatisticsHooks.ts
  FILTER_KEYWORD_STATISTICS: "filterKeywordStatistics",
  // managed by frontend/src/api/hooks/StatisticsHooks.ts
  FILTER_TAG_STATISTICS: "filterTagStatistics",

  // managed by frontend/src/api/hooks/AnnoscalingHooks.ts
  ANNOSCALING_SUGGEST: "annoscalingSuggest",

  // all MlJobReads[] of type DocumentTagRecommendation of a Project (by project id)
  // managed by frontend/src/api/hooks/TagRecommendationHooks.ts
  PROJECT_TAG_RECOMMENDATION_JOBS: "projectTagRecommendationJobs",
  // all DocumentTagRecommendationLinkRead[] of a MLJob (by ml job id)
  // managed by frontend/src/api/hooks/TagRecommendationHooks.ts
  TAG_RECOMMENDATIONS: "tagRecommendations",

  // a single DuplicateFinderJobRead (by duplicate finder job id)
  // managed by frontend/src/api/hooks/JobHooks.ts
  DUPLICATE_FINDER_JOB: "duplicateFinderJob",
  // exportjob (by export job id)
  // managed by frontend/src/api/hooks/JobHooks.ts
  EXPORT_JOB: "exportJob",

  // a single MlJobRead (by ml job id)
  // managed by frontend/src/features/ml-automation/_api/mlAutomationQueryOptions.ts
  ML_JOB: "mlJob",
  // all MlJobRead[] of a project (by project id)
  // managed by frontend/src/features/ml-automation/_api/mlAutomationQueryOptions.ts
  PROJECT_ML_JOBS: "projectMLJobs",

  // all FolderRead[] of a Project (by project id and folder type)
  // managed by frontend/src/api/hooks/FolderHooks.ts
  PROJECT_FOLDERS: "projectFolders",
  // a dict of {doctype: list[sdocIds]} (by sdoc folder id)
  // managed by frontend/src/api/hooks/FolderHooks.ts
  SDOC_IDS_PER_DOCTYPE_IN_FOLDER: "sdocIdsPerDoctypeInFolder",

  // all SourceDocumentStatusSimple[] of a project (by project id, status)
  // managed by frontend/src/api/hooks/DocProcessingHooks.ts
  PROJECT_SDOC_STATUS_SIMPLE: "projectSdocStatusSimple",
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
  // managed by frontend/src/core/memo/table/MemoFilterTable.tsx
  MEMO_TABLE: "search-memo-table-data",
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

  // importjob (by import job id)
  // managed by frontend/src/api/hooks/ImportHooks.ts
  IMPORT_JOB: "importJob",
  // all import jobs of a Project (by project id)
  // managed by frontend/src/api/hooks/ImportHooks.ts
  PROJECT_IMPORT_JOBS: "projectImportJobs",

  // crawlerjob (by crawler job id)
  // managed by frontend/src/api/hooks/DocProcessingHooks.ts
  CRAWLER_JOB: "crawlerJob",
  // all crawler jobs of a Project (by project id)
  // managed by frontend/src/api/hooks/DocProcessingHooks.ts
  PROJECT_CRAWLER_JOBS: "projectCrawlerJobs",

  // llmjob (by llm job id)
  // managed by frontend/src/api/hooks/LLMHooks.ts
  LLM_JOB: "llmJob",
  // all llm jobs of a Project (by project id)
  // managed by frontend/src/api/hooks/LLMHooks.ts
  PROJECT_LLM_JOBS: "projectLLMJobs",
  // the available models (no parameters)
  // managed by frontend/src/api/hooks/LLMHooks.ts
  AVAILABLE_LLMS: "availableLLMs",

  // llmjob (by llm job id)
  // managed by frontend/src/features/classifier/_api/classifierQueryOptions.ts
  CLASSIFIER_JOB: "classifierJob",
  // all classifier jobs of a Project (by project id)
  // managed by frontend/src/features/classifier/_api/classifierQueryOptions.ts
  PROJECT_CLASSIFIER_JOBS: "projectClassifierJobs",
  // all classifiers of a project (by project id)
  // managed by frontend/src/features/classifier/_api/classifierQueryOptions.ts
  PROJECT_CLASSIFIERS: "projectClassifiers",
};
