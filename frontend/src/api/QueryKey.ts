export const QueryKey = {
  // all projects
  PROJECTS: "projects",
  // a single project (by project id)
  PROJECT: "project",
  // all users of a project (by project id)
  PROJECT_USERS: "projectUsers",
  // all documents of a project (by project id)
  PROJECT_SDOCS: "projectDocuments",
  // all codes of a project (by project id)
  PROJECT_CODES: "projectCodes",
  // all tags of a project (by project id)
  PROJECT_TAGS: "projectTags",
  // all crawler jobs of a project (by project id)
  PROJECT_CRAWLER_JOBS: "projectCrawlerJobs",
  // all prepro jobs of a project (by project id)
  PROJECT_PREPROCESSING_JOBS: "projectPreprocessingJobs",
  // all llm jobs of a project (by project id)
  PROJECT_LLM_JOBS: "projectLLMJobs",

  // all users
  USERS: "users",
  // a single user (by user id)
  USER: "user",
  // all projects of the logged-in user
  USER_PROJECTS: "userProjects",
  // all memos of a user (by project id)
  USER_MEMOS: "userMemos",
  // recently k annotated sdocs of the logged-in user (by k)
  USER_ACTIVITY: "userActivity",

  // a memo (by memo id)
  MEMO: "memo",
  // the logged-in user's memo (by code id)
  MEMO_CODE: "codeMemo",
  // the logged-in user's memo (by tag id)
  MEMO_TAG: "tagMemo",
  // the logged-in user's memo (by sdoc id)
  MEMO_SDOC: "sdocMemo",
  // the logged-in user's memo (by span id)
  MEMO_SPAN_ANNOTATION: "spanAnnotationMemo",
  // the logged-in user's memo (by bbox id)
  MEMO_BBOX_ANNOTATION: "bboxAnnotationMemo",
  // the logged-in user's memo (by project id)
  MEMO_PROJECT: "projectMemo",

  // all actions of a project from a user (by project id, user id)
  ACTION: "action",
  // all actions of a project by query parameters
  ACTIONS_QUERY: "actionsQuery",

  // a single document (by sdoc id)
  SDOC: "sdoc",
  // a single document's data (by sdoc id)
  SDOC_DATA: "sdocData",
  // all tags of a document (by sdoc id)
  SDOC_TAGS: "sdocTags",
  // all memos of a document (by sdoc id)
  SDOC_MEMOS: "sdocMemos",
  // Count how many source documents each tag has
  TAG_SDOC_COUNT: "sdocTagCount",
  // annotators (user ids) of a document (by sdoc id)
  SDOC_ANNOTATORS: "sdocAnnotators",
  // span annotations of a document (by sdoc id, user ids)
  SDOC_SPAN_ANNOTATIONS: "sdocSpanAnnotations",
  // bbox annotations of a document (by sdoc id, user ids)
  SDOC_BBOX_ANNOTATIONS: "sdocBBoxAnnotations",
  // all metadata of a document (by sdoc id)
  SDOC_METADATAS: "sdocMetadatas",
  // word frequencies of a document (by sdoc id)
  SDOC_WORD_LEVEL_TRANSCRIPTIONS: "sdocTranscriptions",
  // metadata with given key of a document (by sdoc id, metadata key)
  SDOC_METADATA_BY_KEY: "sdocMetadataByKey",
  // url of a document (by sdoc id)
  SDOC_URL: "sdocURL",
  // thumbnail url of a document (by sdoc id)
  SDOC_THUMBNAIL_URL: "sdocThumbnailURL",
  // linked sdoc ids of a document (by sdoc id)
  SDOC_LINKS: "sdocLinks",
  // id of a single SourceDocument (by project id and filename)
  SDOC_ID: "sdocId",
  // all sdocs that are tagged with the given tag (by tag id)
  SDOCS_BY_TAG_ID: "sdocsByTagId",

  // a single code (by code id)
  CODE: "code",

  // a single tag (by tag id)
  TAG: "tag",

  // a single span annotation (by span annotation id)
  SPAN_ANNOTATION: "annotation",
  // span annotations of a code of the logged-in user (by code id)
  SPAN_ANNOTATIONS_USER_CODE: "annotationsUserCode",
  // a single bbox annotation (by bbox annotation id)
  BBOX_ANNOTATION: "bboxAnnotation",
  // bbox annotations of a code of the logged-in user (by code id)
  BBOX_ANNOTATIONS_USER_CODE: "bboxAnnotationsUserCode",

  // project metadata (by project id)
  PROJECT_METADATAS: "projectMetadatas",

  // a single feedback (by feedback id)
  FEEDBACK: "feedback",
  // all feedback
  FEEDBACKS: "feedbacks",
  // all logged-in user's feedbacks
  FEEDBACKS_USER: "feedbacksUser",

  // a single TABLE (by TABLE id)
  TABLE: "table",
  // all tables of the project of the logged-in user (by project id)
  TABLES_PROJECT_USER: "tablesProjectUser",
  // A single timeline analysis (by id)
  TIMELINE_ANALYSIS: "timelineAnalysis",
  // All analyses from the logged-in user in a given project (by project id)
  TIMELINE_ANALYSIS_PROJECT_USER: "timelineAnalysisProjectUser",

  // a single COTA (by COTA id)
  COTA: "cota",
  // all cotas of a project of the logged-in user (by project id)
  COTAS_PROJECT_USER: "cotasProjectUser",
  // a single COTARefinementJob (by refinement job id)
  COTA_REFINEMENT_JOB: "cotaRefinementJob",
  // the most recent COTARefinementJob of a cota (by cota id)
  COTA_MOST_RECENT_REFINEMENT_JOB: "cotaMostRecentRefinementJob",

  // a single WHITEBOARD (by WHITEBOARD id)
  WHITEBOARD: "whiteboard",
  // all project WHITEBOARDs (by project id)
  WHITEBOARDS_PROJECT: "whiteboardsProject",

  SEARCH_ENTITY_STATISTICS: "searchEntityStatistics",
  FILTER_ENTITY_STATISTICS: "filterEntityStatistics",
  SEARCH_KEYWORD_STATISTICS: "searchKeywordStatistics",
  FILTER_KEYWORD_STATISTICS: "filterKeywordStatistics",
  SEARCH_TAG_STATISTICS: "searchTagStatistics",
  FILTER_TAG_STATISTICS: "filterTagStatistics",

  ANALYSIS_CODE_FREQUENCIES: "analysisCodeFrequencies",
  ANALYSIS_CODE_OCCURRENCES: "analysisCodeOccurrences",
  ANALYSIS_ANNOTATION_OCCURRENCES: "analysisAnnotationOccurrences",

  // preprocessing status of the project (by project id)
  PREPRO_PROJECT_STATUS: "preproProjectStatus",

  // preprojob (by prepro job id)
  PREPRO_JOB: "preProJob",

  // export (by export job id)
  EXPORT_JOB: "exportJob",

  // crawler (by crawler job id)
  CRAWLER_JOB: "crawlerJob",

  // crawler (by llm job id)
  LLM_JOB: "llmJob",

  // tables
  SEARCH_TABLE: "search-document-table-data",

  // table info (info about the columns and their types)
  TABLE_INFO: "tableInfo",
};
