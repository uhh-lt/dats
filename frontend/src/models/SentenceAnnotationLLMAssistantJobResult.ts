/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SentenceAnnotationResult } from "./SentenceAnnotationResult";
export type SentenceAnnotationLLMAssistantJobResult = {
  /**
   * The type of the LLM Assistant task
   */
  task_type: string;
  /**
   * The sentence annotation results, one per document
   */
  results: Array<SentenceAnnotationResult>;
};
