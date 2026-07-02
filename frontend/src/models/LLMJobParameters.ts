/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationParams } from "./AnnotationParams";
import type { MetadataExtractionParams } from "./MetadataExtractionParams";
import type { SentenceAnnotationParams } from "./SentenceAnnotationParams";
import type { TaggingParams } from "./TaggingParams";
import type { TaskType } from "./TaskType";
export type LLMJobParameters = {
  /**
   * Project ID associated with the job
   */
  project_id: number;
  /**
   * The type of the LLMJob (what to llm)
   */
  llm_job_type: TaskType;
  /**
   * Specific parameters for the LLMJob w.r.t it's type
   */
  specific_task_parameters: TaggingParams | MetadataExtractionParams | AnnotationParams | SentenceAnnotationParams;
};
