/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationResult } from "./AnnotationResult";
export type AnnotationLLMAssistantJobResult = {
  /**
   * The type of the LLM Assistant task
   */
  task_type: string;
  /**
   * The annotation results, one per document
   */
  results: Array<AnnotationResult>;
};
