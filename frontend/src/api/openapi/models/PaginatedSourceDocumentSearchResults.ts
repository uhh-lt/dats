/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SourceDocumentRead } from "./SourceDocumentRead";

export type PaginatedSourceDocumentSearchResults = {
  /**
   * Flag that indicates whether there are more search results.
   */
  has_more: boolean;
  /**
   * The offset that returns the current results.
   */
  current_page_offset: number;
  /**
   * The offset that returns the next results.
   */
  next_page_offset: number;
  /**
   * The SourceDocument search results on the requested page.
   */
  sdocs: Array<SourceDocumentRead>;
};
