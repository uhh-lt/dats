/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationLLMJobResult } from "./AnnotationLLMJobResult";
import type { DocumentTaggingLLMJobResult } from "./DocumentTaggingLLMJobResult";
import type { LLMJobType } from "./LLMJobType";
import type { MetadataExtractionLLMJobResult } from "./MetadataExtractionLLMJobResult";
export type LLMJobResult = {
  /**
   * The type of the LLMJob (what to llm)
   */
  llm_job_type: LLMJobType;
  /**
   * Specific result for the LLMJob w.r.t it's type
   */
  specific_llm_job_result: DocumentTaggingLLMJobResult | MetadataExtractionLLMJobResult | AnnotationLLMJobResult;
};
