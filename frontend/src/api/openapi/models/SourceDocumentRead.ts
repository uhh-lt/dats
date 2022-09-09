/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { DocType } from "./DocType";

export type SourceDocumentRead = {
  /**
   * Filename of the SourceDocument
   */
  filename: string;
  /**
   * Content of the SourceDocument
   */
  content: string;
  /**
   * DOCTYPE of the SourceDocument
   */
  doctype: DocType;
  /**
   * Project the SourceDocument belongs to
   */
  project_id: number;
  /**
   * ID of the SourceDocument
   */
  id: number;
  /**
   * The created timestamp of the SourceDocument
   */
  created: string;
};
