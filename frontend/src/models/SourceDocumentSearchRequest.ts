/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_SdocColumns__Input } from "./Filter_SdocColumns__Input";
import type { Sort_SdocColumns_ } from "./Sort_SdocColumns_";
/**
 * Request of the document search: full-text query, filter, sorting, folders
 * and paging in one body.
 */
export type SourceDocumentSearchRequest = {
  /**
   * Full-text query
   */
  search_query?: string;
  /**
   * Whether the query uses the expert syntax
   */
  expert_mode?: boolean;
  /**
   * Whether to return highlights of the query
   */
  highlight?: boolean;
  /**
   * Column filter tree
   */
  filter: Filter_SdocColumns__Input;
  /**
   * Ordered sort expressions; empty means the default sort
   */
  sorts?: Array<Sort_SdocColumns_>;
  /**
   * Only the documents of this folder
   */
  folder_id?: number | null;
  /**
   * Whether to group the documents by folder
   */
  show_folders?: boolean;
  /**
   * Whether to show the child folders
   */
  show_child_folders?: boolean;
  /**
   * Zero-based page index; all hits if null
   */
  page_number?: number | null;
  /**
   * Number of hits per page; all hits if null
   */
  page_size?: number | null;
};
