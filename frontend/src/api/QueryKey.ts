export const QueryKey = {
  PROJECTS: "projects", // all projects
  PROJECT: "project", // a single project
  PROJECT_USERS: "projectUsers",
  PROJECT_DOCUMENTS: "projectDocuments",
  PROJECT_CODES: "projectCodes",
  PROJECT_TAGS: "projectTags",
  // the logbook
  PROJECT_MEMO: "projectMemo",

  USER: "user",
  USER_PROJECTS: "userProjects",
  USERS: "users",
  USER_CODES: "userCodes",
  // get all memos by user id
  USER_MEMOS: "userMemos",

  // get memo by memo id
  MEMO: "memo",
  // get memo by code id
  MEMO_CODE: "codeMemo",
  // get memo by tag id
  MEMO_TAG: "tagMemo",
  // get memo by sdoc id
  MEMO_SDOC: "sdocMemo",
  // get memo by span annotation id
  MEMO_SPAN_ANNOTATION: "spanAnnotationMemo",
  // get memo by bbox annotation id
  MEMO_BBOX_ANNOTATION: "bboxAnnotationMemo",

  SDOC: "sdoc",
  SDOC_NO_CONTENT: "sdocNoContent",
  SDOC_BY_ADOC: "sdocByAdoc",
  SDOC_TAGS: "sdocTags",
  SDOC_ADOCS: "sdocAdocs",
  SDOC_METADATAS: "sdocMetadatas",
  SDOC_TOKENS: "sdocTokens",
  SDOC_KEYWORDS: "sdocKeywords",
  SDOC_URL: "sdocURL",

  SDOCS_DOCUMENT_TAGS: "sdocsDocumentTags",

  ADOC: "adoc",
  ADOC_SPAN_ANNOTATIONS: "adocSpanAnnotations",
  ADOC_BBOX_ANNOTATIONS: "adocBboxAnnotations",

  CODE: "code",
  TAG: "tag",
  SPAN_ANNOTATION: "annotation",
  BBOX_ANNOTATION: "bboxAnnotation",
  METADATA: "metadata",

  FEEDBACK: "feedback",
  FEEDBACKS: "feedbacks",

  SEARCH_ENTITY_STATISTICS: "searchEntityStatistics",
  SEARCH_KEYWORD_STATISTICS: "searchKeywordStatistics",
  SEARCH_RESULTS: "searchResults",

  SEARCH_MEMO_CONTENT: "searchMemoContent",
  SEARCH_MEMO_TITLE: "searchMemoTitle",

  KEYWORDS: "keywords",
};
