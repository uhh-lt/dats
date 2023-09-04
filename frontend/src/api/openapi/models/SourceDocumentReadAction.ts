/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { DocType } from "./DocType";
import type { DocumentTagRead } from "./DocumentTagRead";
import type { SDocStatus } from "./SDocStatus";
import type { SourceDocumentMetadataRead } from "./SourceDocumentMetadataRead";

export type SourceDocumentReadAction = {
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
   * Status of the SourceDocument
   */
  status: SDocStatus;
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
  /**
   * Updated timestamp of the Memo
   */
  updated: string;
  /**
   * Tags of the SourceDocument
   */
  tags: Array<DocumentTagRead>;
  /**
   * Metadata of the SourceDocument
   */
  metadata: Array<SourceDocumentMetadataRead>;
};
