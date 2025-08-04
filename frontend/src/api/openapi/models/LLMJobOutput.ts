/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationLLMJobResult } from "./AnnotationLLMJobResult";
import type { MetadataExtractionLLMJobResult } from "./MetadataExtractionLLMJobResult";
import type { SentenceAnnotationLLMJobResult } from "./SentenceAnnotationLLMJobResult";
import type { TaggingLLMJobResult } from "./TaggingLLMJobResult";
import type { TaskType } from "./TaskType";
export type LLMJobOutput = {
  /**
   * The type of the LLMJob (what to llm)
   */
  llm_job_type: TaskType;
  /**
   * Specific result for the LLMJob w.r.t it's type
   */
  specific_task_result:
    | TaggingLLMJobResult
    | MetadataExtractionLLMJobResult
    | AnnotationLLMJobResult
    | SentenceAnnotationLLMJobResult;
};
