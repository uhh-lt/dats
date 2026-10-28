/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationLLMAssistantJobResult } from "./AnnotationLLMAssistantJobResult";
import type { ApproachType } from "./ApproachType";
import type { MetadataExtractionLLMAssistantJobResult } from "./MetadataExtractionLLMAssistantJobResult";
import type { SentenceAnnotationLLMAssistantJobResult } from "./SentenceAnnotationLLMAssistantJobResult";
import type { TaggingLLMAssistantJobResult } from "./TaggingLLMAssistantJobResult";
import type { TaskType } from "./TaskType";
export type LLMAssistantJobOutput = {
  /**
   * The type of the LLMAssistantJob (what to llm)
   */
  task_type: TaskType;
  /**
   * Few-shot if the prompt showed examples, zero-shot otherwise
   */
  approach_type: ApproachType;
  /**
   * Specific result for the LLMAssistantJob w.r.t it's type
   */
  specific_task_result:
    | TaggingLLMAssistantJobResult
    | MetadataExtractionLLMAssistantJobResult
    | AnnotationLLMAssistantJobResult
    | SentenceAnnotationLLMAssistantJobResult;
};
