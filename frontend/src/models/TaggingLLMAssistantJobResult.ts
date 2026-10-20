/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaggingResult } from "./TaggingResult";
export type TaggingLLMAssistantJobResult = {
  /**
   * The type of the LLM Assistant task
   */
  task_type: string;
  /**
   * The tagging results, one per document
   */
  results: Array<TaggingResult>;
};
