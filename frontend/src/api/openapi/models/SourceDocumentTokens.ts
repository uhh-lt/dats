/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SourceDocumentTokens = {
  /**
   * ID of the SourceDocument the Tokens belong to.
   */
  source_document_id: number;
  /**
   * The (textual) list Tokens of the SourceDocument the Tokens belong to.
   */
  tokens: Array<string>;
  /**
   * The list of character offsets of the Tokens
   */
  token_character_offsets?: Array<Array<any>>;
};
