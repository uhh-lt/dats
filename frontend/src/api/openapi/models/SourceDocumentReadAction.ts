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
   * User-defined name of the document (default is the filename)
   */
  name: string;
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
   * The (textual) content of the SourceDocument the content belongs to.
   */
  content: string;
  /**
   * The (html) content of the SourceDocument.
   */
  html: string;
  /**
   * The (textual) list Tokens of the SourceDocument the Tokens belong to.
   */
  tokens: Array<string>;
  /**
   * The list of character offsets of the Tokens
   */
  token_character_offsets?: Array<Array<any>>;
  /**
   * The Sentences of the SourceDocument the Sentences belong to.
   */
  sentences: Array<string>;
  /**
   * The list of character offsets of the Sentences
   */
  sentence_character_offsets?: Array<Array<any>>;
  /**
   * Tags of the SourceDocument
   */
  tags: Array<DocumentTagRead>;
  /**
   * Metadata of the SourceDocument
   */
  metadata: Array<SourceDocumentMetadataRead>;
};
