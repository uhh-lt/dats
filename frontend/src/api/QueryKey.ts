export const QueryKey = {
  // managed by AuthProvider
  // the logged-in user (by access token)
  ME: "me",

  // managed by GeneralHooks
  // the instance info (no parameters)
  INSTANCE_INFO: "instanceInfo",

  // managed by UserHooks
  // all UserRead[] of a Project (by project id)
  PROJECT_USERS: "projectUsers",

  // managed by CodeHooks
  // CodeMap of a Project (by project id)
  PROJECT_CODES: "projectCodes",

  // managed by TagHooks
  // all TagRead[] of a Project (by project id)
  PROJECT_TAGS: "projectTags",
  // all TagRead Ids of a SourceDocument (by sdoc id)
  SDOC_TAGS: "sdocTags",
  // Record[docTagId, docTagCount] of SourceDocuments (by sdoc ids)
  TAG_SDOC_COUNT: "sdocTagCount",

  // managed by ProjectHooks
  // all ProjectRead[] of the logged-in user (no parameters)
  USER_PROJECTS: "userProjects",

  // managed by SdocHooks:
  // a single SourceDocumentRead (by sdoc id)
  SDOC: "sdoc",
  // a single SourceDocumentDataRead (by sdoc id)
  SDOC_DATA: "sdocData",
  // id of a single SourceDocument (by project id and filename)
  SDOC_ID: "sdocId",
  // linked sdoc ids of a document (by sdoc id)
  SDOC_LINKS: "sdocLinks",
  // thumbnail url of a document (by sdoc id)
  SDOC_THUMBNAIL_URL: "sdocThumbnailURL",
  // all SourceDocument ids tagged with the given tag (by tag id)
  SDOC_IDS_BY_TAG_ID: "sdocIdsByTagId",
  // annotators (user ids) of a document (by sdoc id)
  SDOC_ANNOTATORS: "sdocAnnotators",

  // managed by MemoHooks:
  // a single MemoRead (by memo id)
  MEMO: "memo",
  // a single MemoRead of the logged in user (by attachedObjectType, attachedObjectId)
  USER_MEMO: "userMemo",
  // all MemoRead[] of the attached object (by attachedObjectType, attachedObjectId)
  OBJECT_MEMOS: "objectMemos",

  // managed by SpanAnnotationHooks:
  // a single SpanAnnotationRead (by span annotation id)
  SPAN_ANNOTATION: "annotation",
  // SpanAnnotationRead[] of a code of the logged-in user (by code id)
  SPAN_ANNOTATIONS_USER_CODE: "annotationsUserCode",
  // SpanAnnotationRead[] (by sdoc id, user id)
  SDOC_SPAN_ANNOTATIONS: "sdocSpanAnnotations",

  // managed by BBoxAnnotationHooks:
  // a single BBoxAnnotationRead (by bbox annotation id)
  BBOX_ANNOTATION: "bboxAnnotation",
  // BBoxAnnotationRead[] of a code of the logged-in user (by code id)
  BBOX_ANNOTATIONS_USER_CODE: "bboxAnnotationsUserCode",
  // BBoxAnnotationRead[] of a document (by sdoc id, user id)
  SDOC_BBOX_ANNOTATIONS: "sdocBBoxAnnotations",

  // managed by SentenceAnnotationHooks:
  // a single SentenceAnnotationRead (by sentence annotation id)
  SENTENCE_ANNOTATION: "sentenceAnnotation",
  // SentenceAnnotator of a document (by sdoc id, user id)
  SDOC_SENTENCE_ANNOTATOR: "sdocSentenceAnnotator",

  // managed by WhiteboardHooks:
  // WhiteboardMap of a project (by project id)
  PROJECT_WHITEBOARDS: "projectWhiteboards",

  // managed by TimelineAnalysisHooks:
  // TimelineMap of a project (by project id)
  PROJECT_TIMELINE_ANALYSIS: "projectTimelineAnalysis",

  // managed by CodeFrequencyHooks:
  // CodeFrequency[] (by project id, user ids, code ids, doc types)
  ANALYSIS_CODE_FREQUENCIES: "analysisCodeFrequencies",
  // CodeOccurrence[] (by project id, user ids, code id)
  ANALYSIS_CODE_OCCURRENCES: "analysisCodeOccurrences",

  // managed by CotaHooks:
  // CotaMap of a project (by project id)
  PROJECT_COTAS: "projectCotas",
  // the most recent COTARefinementJobRead of a cota (by cota id)
  COTA_MOST_RECENT_REFINEMENT_JOB: "cotaMostRecentRefinementJob",

  // managed by MetadataHooks:
  // ProjectMetadataMap of a Project (by project id)
  PROJECT_METADATAS: "projectMetadatas",
  // SdocMetadataMap of a SourceDocument (by sdoc id)
  SDOC_METADATAS: "sdocMetadatas",
  // SourceDocumentMetadataRead with given key of a document (by sdoc id, metadata key)
  SDOC_METADATA_BY_KEY: "sdocMetadataByKey",

  // managed by PerspectivesHooks:
  // Aspects of a Project (by project id)
  PROJECT_ASPECTS: "projectAspects",
  // A single aspect (by aspect id)
  ASPECT: "aspect",
  // A single Perspectives Job (by perspectives job id)
  PERSPECTIVES_JOB: "perspectivesJob",
  // A DocumentVisualization (by aspect id)
  DOCUMENT_VISUALIZATION: "documentVisualization",
  // ClusterSimilarities (by aspect id)
  CLUSTER_SIMILARITIES: "clusterSimilarities",
  // Cluster of a SourceDocument (by aspect id, sdoc id)
  SDOC_CLUSTES: "sdocClusters",
  // Document Aspect content (by aspect id, sdoc id)
  SDOC_ASPECT_CONTENT: "sdocAspectContent",

  // managed by SearchStatisticsHooks:
  FILTER_ENTITY_STATISTICS: "filterEntityStatistics",
  FILTER_KEYWORD_STATISTICS: "filterKeywordStatistics",
  FILTER_TAG_STATISTICS: "filterTagStatistics",

  // managed by AnnoscalingHooks:
  ANNOSCALING_SUGGEST: "annoscalingSuggest",

  // managed by TagRecommendationHooks:
  // all MLJobReads[] of type DocumentTagRecommendation of a Project (by project id)
  PROJECT_TAG_RECOMMENDATION_JOBS: "projectTagRecommendationJobs",
  // all DocumentTagRecommendationLinkRead[] of a MLJob (by ml job id)
  TAG_RECOMMENDATIONS: "tagRecommendations",

  // managed by JobHooks
  // a single DuplicateFinderJobRead (by duplicate finder job id)
  DUPLICATE_FINDER_JOB: "duplicateFinderJob",

  // tables
  SEARCH_TABLE: "search-document-table-data",
  SDOC_TABLE: "document-table-data",
  MEMO_TABLE: "search-memo-table-data",
  SPAN_ANNO_TABLE: "span-annotation-table-data",
  BBOX_TABLE: "bbox-annotation-table-data",
  SENT_ANNO_TABLE: "sentence-annotation-table-data",
  WORD_FREQUENCY_TABLE: "wordfrequency-table-data",

  // search
  IMG_SIMSEARCH: "image-similarity-search",
  SENT_SIMSEARCH: "sentence-similarity-search",

  // managed by various useInit*FilterSlice:
  // table info (by filterSliceName, projectId) (info about the columns and their types)
  TABLE_INFO: "tableInfo",

  // TODO: Here is potential to refactor backend & frontend: BackgroundJobService
  // managed by ExportHooks:
  // exportjob (by export job id)
  EXPORT_JOB: "exportJob",

  // managed by ImportHooks:
  // importjob (by import job id)
  IMPORT_JOB: "importJob",
  // all import jobs of a Project (by project id)
  PROJECT_IMPORT_JOBS: "projectImportJobs",

  // managed by CrawlerHooks:
  // crawlerjob (by crawler job id)
  CRAWLER_JOB: "crawlerJob",
  // all crawler jobs of a Project (by project id)
  PROJECT_CRAWLER_JOBS: "projectCrawlerJobs",

  // managed by PreProHooks:
  // preprojob (by prepro job id)
  PREPRO_JOB: "preProJob",
  // all prepro jobs of a Project (by project id)
  PROJECT_PREPROCESSING_JOBS: "projectPreprocessingJobs",
  // preprocessing status of the project (by project id)
  PREPRO_PROJECT_STATUS: "preproProjectStatus",

  // managed by LLMHooks:
  // llmjob (by llm job id)
  LLM_JOB: "llmJob",
  // all llm jobs of a Project (by project id)
  PROJECT_LLM_JOBS: "projectLLMJobs",

  // managed by MLHooks:
  ML_JOB: "mlJob",
  // all ML jobs of a proect (by project id)
  PROJECT_ML_JOBS: "projectMLJobs",
};
