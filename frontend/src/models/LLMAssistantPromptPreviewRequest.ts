/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationParams } from "./AnnotationParams";
import type { DefaultStrategyParams } from "./DefaultStrategyParams";
import type { FuzzyGroundingStrategyParams } from "./FuzzyGroundingStrategyParams";
import type { LLMAssistantPromptTemplates } from "./LLMAssistantPromptTemplates";
import type { MetadataExtractionParams } from "./MetadataExtractionParams";
import type { NERInlineTagStrategyParams } from "./NERInlineTagStrategyParams";
import type { SentenceAnnotationParams } from "./SentenceAnnotationParams";
import type { StrategyType } from "./StrategyType";
import type { TaggingParams } from "./TaggingParams";
import type { TaskType } from "./TaskType";
/**
 * Renders the prompt templates for one message of one document.
 */
export type LLMAssistantPromptPreviewRequest = {
  /**
   * The prompt templates to use, one per supported language. Exactly one of prompts and prompt_template_version_id is set.
   */
  prompts?: Array<LLMAssistantPromptTemplates> | null;
  /**
   * ID of the stored prompt template version to use. Exactly one of prompts and prompt_template_version_id is set.
   */
  prompt_template_version_id?: number | null;
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
  /**
   * The strategy to render the prompts with
   */
  strategy_type: StrategyType;
  /**
   * Specific parameters for the strategy w.r.t it's type
   */
  specific_strategy_parameters: DefaultStrategyParams | NERInlineTagStrategyParams | FuzzyGroundingStrategyParams;
  /**
   * ID of the source document to render
   */
  sdoc_id: number;
  /**
   * Index of the message (sentence or chunk) within the document
   */
  message_index?: number;
};
