/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SpanEntity } from "./SpanEntity";

export type SearchSDocsQueryParameters = {
  /**
   * The ID of the Project the SourceDocuments have to belong to.
   */
  proj_id: number;
  /**
   * The IDs of the User the SourceDocuments have to belong to.
   */
  user_ids?: Array<number>;
  /**
   * List of Keywords that have to be present in the SourceDocuments keywords (via Elasticsearch)
   */
  keywords?: Array<string>;
  /**
   * List of SearchTerms that have to be present in the SourceDocuments content (via Elasticsearch)
   */
  search_terms?: Array<string>;
  /**
   * List of SpanEntities that have to be present in the SourceDocuments
   */
  span_entities?: Array<SpanEntity>;
  /**
   * List of IDs of DocumentTags the SourceDocuments have to be tagged with
   */
  tag_ids?: Array<number>;
  /**
   * If true return SourceDocuments tagged with all DocumentTags, or anyof the DocumentTags otherwise
   */
  all_tags?: boolean;
};
