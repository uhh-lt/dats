/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationParams } from "./AnnotationParams";
import type { DocumentTaggingParams } from "./DocumentTaggingParams";
import type { MetadataExtractionParams } from "./MetadataExtractionParams";
import type { SentenceAnnotationParams } from "./SentenceAnnotationParams";
import type { TaskType } from "./TaskType";
export type LLMJobParameters = {
  /**
   * The type of the LLMJob (what to llm)
   */
  llm_job_type: TaskType;
  /**
   * The ID of the Project to analyse
   */
  project_id: number;
  /**
   * Specific parameters for the LLMJob w.r.t it's type
   */
  specific_task_parameters:
    | DocumentTaggingParams
    | MetadataExtractionParams
    | AnnotationParams
    | SentenceAnnotationParams;
};
