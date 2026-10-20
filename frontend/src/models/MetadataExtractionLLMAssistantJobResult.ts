/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetadataExtractionResult } from "./MetadataExtractionResult";
export type MetadataExtractionLLMAssistantJobResult = {
  /**
   * The type of the LLM Assistant task
   */
  task_type: string;
  /**
   * The metadata extraction results, one per document
   */
  results: Array<MetadataExtractionResult>;
};
