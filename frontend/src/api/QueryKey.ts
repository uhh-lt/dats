export const QueryKey = {
  // all projects
  PROJECTS: "projects",
  // a single project (by project id)
  PROJECT: "project",
  // all users of a project (by project id)
  PROJECT_USERS: "projectUsers",
  // all documents of a project (by project id)
  PROJECT_SDOCS: "projectDocuments",
  // all documents of a project (by project id) for infinite scrolling
  PROJECT_SDOCS_INFINITE: "projectDocumentsInfinite",
  // all codes of a project (by project id)
  PROJECT_CODES: "projectCodes",
  // all tags of a project (by project id)
  PROJECT_TAGS: "projectTags",

  // all users
  USERS: "users",
  // a single user (by user id)
  USER: "user",
  // all projects of a user (by user id)
  USER_PROJECTS: "userProjects",
  // all codes of a user (by user id)
  USER_CODES: "userCodes",
  // all memos of a user (by user id)
  USER_MEMOS: "userMemos",

  // a memo (by memo id)
  MEMO: "memo",
  // all memos attached to a code (by code id) or a user's memo (by code id, user id)
  MEMO_CODE: "codeMemo",
  // all memos attached to a tag (by tag id) or a user's memo (by tag id, user id)
  MEMO_TAG: "tagMemo",
  // all memos attached to a document (by document id) or a user's memo (by document id, user id)
  MEMO_SDOC: "sdocMemo",
  // all memos of a user attached to a document and its annotations (span, bbox) (by user id, document id)
  MEMO_SDOC_RELATED: "sdocRelatedMemos",
  // all memos attached to a span (by span id) or a user's memo (by span id, user id)
  MEMO_SPAN_ANNOTATION: "spanAnnotationMemo",
  // all memos attached to a bbox (by bbox id) or a user's memo (by bbox id, user id)
  MEMO_BBOX_ANNOTATION: "bboxAnnotationMemo",
  // all memos attached to a project (by project id) or a user's memo (by project id, user id)
  MEMO_PROJECT: "projectMemo",
  // all memos which content matches the query (by query string)
  MEMOS_BY_CONTENT_SEARCH: "memosByContentSearch",
  // all memos which title matches the query (by query string)
  MEMOS_BY_TITLE_SEARCH: "memosByContentSearch",

  // all actions of a project from a user (by project id, user id)
  ACTION: "action",

  // a single document (by document id)
  SDOC: "sdoc",
  // a single document without content (by document id)
  SDOC_NO_CONTENT: "sdocNoContent",
  // a single document (by adoc id)
  SDOC_BY_ADOC: "sdocByAdoc",
  // all tags of a document (by document id)
  SDOC_TAGS: "sdocTags",
  // all adocs of a document (by document id)
  SDOC_ADOCS: "sdocAdocs",
  // all metadata of a document (by document id)
  SDOC_METADATAS: "sdocMetadatas",
  // tokens of a document (by document id)
  SDOC_TOKENS: "sdocTokens",
  // keywords of a document (by document id)
  SDOC_KEYWORDS: "sdocKeywords",
  // word frequencies of a document (by document id)
  SDOC_WORD_FREQUENCIES: "sdocFrequencies",
  // sentences of a document (by document id)
  SDOC_SENTENCES: "sdocSentences",
  // content of a document (by document id)
  SDOC_CONTENT: "sdocContent",
  // url of a document (by document id)
  SDOC_URL: "sdocURL",
  // linked sdoc ids of a document (by document id)
  SDOC_LINKS: "sdocLinks",
  // id of a single SourceDocument (by project id and filename)
  SDOC_ID: "sdocId",
  // all sdocs which are in the project (by project id) and tagged with given tag (by tag id)
  SDOCS_BY_PROJECT_AND_TAG_SEARCH: "sdocsByProjectAndTagSearch",
  // all sdocs which are in the project (by project id) and suffice the given filters (by filter list)
  SDOCS_BY_PROJECT_AND_FILTERS_SEARCH: "searchResults",

  // all spans annotations of a adoc (by adoc id)
  ADOC_SPAN_ANNOTATIONS: "adocSpanAnnotations",
  // all bbox annotations of a adoc (by adoc id)
  ADOC_BBOX_ANNOTATIONS: "adocBboxAnnotations",

  // a single code (by code id)
  CODE: "code",

  // a single tag (by tag id)
  TAG: "tag",

  // a single span annotation (by span annotation id)
  SPAN_ANNOTATION: "annotation",
  // a single bbox annotation (by bbox annotation id)
  BBOX_ANNOTATION: "bboxAnnotation",

  // a single metadata (by metadata id)
  METADATA: "metadata",

  // a single feedback (by feedback id)
  FEEDBACK: "feedback",
  // all feedbacks
  FEEDBACKS: "feedbacks",

  SEARCH_ENTITY_STATISTICS: "searchEntityStatistics",
  SEARCH_KEYWORD_STATISTICS: "searchKeywordStatistics",
  SEARCH_TAG_STATISTICS: "searchTagStatistics",
  SEARCH_SENTENCE_SIMILARITY: "searchSentenceSimilarity",

  ANALYSIS_CODE_FREQUENCIES: "analysisCodeFrequencies",

  // preprocessing status of the project (by project id)
  PREPRO_PROJECT_STATUS: "preproProjectStatus",
};
