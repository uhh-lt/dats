/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationLLMJobParams } from "./AnnotationLLMJobParams";
import type { DocumentTaggingLLMJobParams } from "./DocumentTaggingLLMJobParams";
import type { LLMJobType } from "./LLMJobType";
import type { LLMPromptTemplates } from "./LLMPromptTemplates";
import type { MetadataExtractionLLMJobParams } from "./MetadataExtractionLLMJobParams";
export type LLMJobParameters = {
  /**
   * The type of the LLMJob (what to llm)
   */
  llm_job_type: LLMJobType;
  /**
   * The ID of the Project to analyse
   */
  project_id: number;
  /**
   * The prompt templates to use for the job
   */
  prompts: Array<LLMPromptTemplates>;
  /**
   * Specific parameters for the LLMJob w.r.t it's type
   */
  specific_llm_job_parameters: DocumentTaggingLLMJobParams | MetadataExtractionLLMJobParams | AnnotationLLMJobParams;
};
