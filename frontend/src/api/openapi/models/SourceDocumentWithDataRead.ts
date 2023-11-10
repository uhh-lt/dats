/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { DocType } from "./DocType";
import type { SDocStatus } from "./SDocStatus";

export type SourceDocumentWithDataRead = {
  /**
   * ID of the SourceDocument
   */
  id: number;
  /**
   * Raw,original content of the SourceDocument
   */
  content: string;
  /**
   * Processed HTML of the SourceDocument
   */
  html: string;
  /**
   * Start of each token in character offsets in content
   */
  token_starts: Array<number>;
  /**
   * End of each token in character offsets in content
   */
  token_ends: Array<number>;
  /**
   * Start of each sentence in character offsets in content
   */
  sentence_starts: Array<number>;
  /**
   * End of each sentence in character offsets in content
   */
  sentence_ends: Array<number>;
  /**
   * List of tokens in the SourceDocument
   */
  tokens: Array<string>;
  /**
   * List of character offsets of each token
   */
  token_character_offsets: Array<Array<any>>;
  /**
   * List of sentences in the SourceDocument
   */
  sentences: Array<string>;
  /**
   * List of character offsets of each sentence
   */
  sentence_character_offsets: Array<Array<any>>;
  /**
   * Filename of the SourceDocument
   */
  filename: string;
  /**
   * User-defined name of the document
   */
  name?: string;
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
   * The created timestamp of the SourceDocument
   */
  created: string;
  /**
   * Updated timestamp of the Memo
   */
  updated: string;
};
