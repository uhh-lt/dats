/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationParams } from "./AnnotationParams";
import type { ApproachType } from "./ApproachType";
import type { DefaultStrategyParams } from "./DefaultStrategyParams";
import type { FewShotParams } from "./FewShotParams";
import type { FuzzyGroundingStrategyParams } from "./FuzzyGroundingStrategyParams";
import type { MetadataExtractionParams } from "./MetadataExtractionParams";
import type { NERInlineTagStrategyParams } from "./NERInlineTagStrategyParams";
import type { SentenceAnnotationParams } from "./SentenceAnnotationParams";
import type { StrategyType } from "./StrategyType";
import type { TaggingParams } from "./TaggingParams";
import type { TaskType } from "./TaskType";
import type { ZeroShotParams } from "./ZeroShotParams";
export type LLMAssistantJobInput = {
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
   * The approach to use for the LLMAssistantJob
   */
  approach_type: ApproachType;
  /**
   * Specific parameters for the approach w.r.t it's type
   */
  specific_approach_parameters: ZeroShotParams | FewShotParams;
  /**
   * The strategy to use for the LLMAssistantJob
   */
  strategy_type: StrategyType;
  /**
   * Specific parameters for the strategy w.r.t it's type
   */
  specific_strategy_parameters: DefaultStrategyParams | NERInlineTagStrategyParams | FuzzyGroundingStrategyParams;
};
