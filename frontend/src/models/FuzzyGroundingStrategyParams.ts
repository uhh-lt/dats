/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FuzzyGroundingStrategyParams = {
  llm_strategy_type: string;
  /**
   * Minimum similarity ratio (0-1) for fuzzy grounding of extracted quotes
   */
  fuzzy_threshold?: number;
  /**
   * Number of context characters the LLM should provide before the quote
   */
  context_before_chars?: number;
  /**
   * Number of context characters the LLM should provide after the quote
   */
  context_after_chars?: number;
  /**
   * Size of document chunks (in tokens) sent to the LLM
   */
  chunk_size_tokens?: number;
  /**
   * Overlap (in tokens) between consecutive chunks
   */
  chunk_overlap_tokens?: number;
};
