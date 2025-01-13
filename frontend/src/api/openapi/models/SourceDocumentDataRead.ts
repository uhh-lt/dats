/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WordLevelTranscription } from "./WordLevelTranscription";
export type SourceDocumentDataRead = {
  /**
   * ID of the SourceDocument
   */
  id: number;
  /**
   * ID of the Project the SourceDocument belongs to
   */
  project_id: number;
  /**
   * Relative path to the SourceDocument in the repository
   */
  repo_url: string;
  /**
   * Processed HTML of the SourceDocument
   */
  html: string;
  /**
   * List of tokens in the SourceDocument
   */
  tokens: Array<string>;
  /**
   * List of character offsets of each token
   */
  token_character_offsets: Array<any[]>;
  /**
   * List of sentences in the SourceDocument
   */
  sentences: Array<string>;
  /**
   * word level transcriptions, with tokens, start times and end times
   */
  word_level_transcriptions?: Array<WordLevelTranscription> | null;
};
