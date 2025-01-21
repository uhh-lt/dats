/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LLMPromptTemplates } from "./LLMPromptTemplates";
export type ZeroShotParams = {
  llm_approach_type: string;
  /**
   * The prompt templates to use for the job
   */
  prompts: Array<LLMPromptTemplates>;
};
