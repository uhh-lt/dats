/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DefaultStrategyParams } from "./DefaultStrategyParams";
import type { FuzzyGroundingStrategyParams } from "./FuzzyGroundingStrategyParams";
import type { NERInlineTagStrategyParams } from "./NERInlineTagStrategyParams";
import type { StrategyType } from "./StrategyType";
/**
 * Describes an available strategy for a task, for display in the frontend.
 */
export type StrategyInfo = {
  /**
   * The strategy type
   */
  llm_strategy_type: StrategyType;
  /**
   * Human-readable name of the strategy
   */
  name: string;
  /**
   * Explanation of what the strategy does
   */
  description: string;
  /**
   * Default strategy parameters
   */
  default_params: DefaultStrategyParams | NERInlineTagStrategyParams | FuzzyGroundingStrategyParams;
  /**
   * Data tags (document content placeholders) this strategy supports
   */
  allowed_data_tags: Array<string>;
};
