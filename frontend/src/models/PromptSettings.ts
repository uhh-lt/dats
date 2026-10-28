/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Settings of the document and output format blocks.
 */
export type PromptSettings = {
  /**
   * Size of the chunks of <document:chunks> in tokens
   */
  chunk_size_tokens?: number;
  /**
   * Overlap of consecutive chunks of <document:chunks> in tokens
   */
  chunk_overlap_tokens?: number;
  /**
   * Characters of context before a quote (<output-format:context>)
   */
  context_before_chars?: number;
  /**
   * Characters of context after a quote (<output-format:context>)
   */
  context_after_chars?: number;
  /**
   * Minimum similarity (0-1) to locate a quote that is not found exactly (<output-format:context>)
   */
  fuzzy_threshold?: number;
};
