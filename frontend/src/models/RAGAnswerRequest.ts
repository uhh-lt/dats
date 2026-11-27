/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RAGAnswerRequest = {
  /**
   * The question to answer
   */
  query: string;
  /**
   * The SourceDocuments to answer from; all if null
   */
  sdoc_ids: Array<number> | null;
  /**
   * Number of retrieved sentences
   */
  top_k: number;
  /**
   * Minimum similarity of a retrieved sentence
   */
  threshold: number;
  /**
   * The LLM that answers
   */
  model: string;
  /**
   * The chat session to continue; a new one if null
   */
  session_id?: string | null;
};
