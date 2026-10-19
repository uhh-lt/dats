/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationParams } from "./AnnotationParams";
import type { MetadataExtractionParams } from "./MetadataExtractionParams";
import type { SentenceAnnotationParams } from "./SentenceAnnotationParams";
import type { TaggingParams } from "./TaggingParams";
import type { TaskType } from "./TaskType";
export type LLMAssistantJobParameters = {
  /**
   * Project ID associated with the job
   */
  project_id: number;
  /**
   * The type of the LLMAssistantJob (what to llm)
   */
  task_type: TaskType;
  /**
   * Specific parameters for the LLMAssistantJob w.r.t it's type
   */
  specific_task_parameters: TaggingParams | MetadataExtractionParams | AnnotationParams | SentenceAnnotationParams;
};
