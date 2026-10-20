/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LLMAssistantPromptTemplates } from "./LLMAssistantPromptTemplates";
export type FewShotParams = {
  /**
   * The approach of the LLM Assistant job
   */
  approach_type: string;
  /**
   * The prompt templates to use for the job
   */
  prompts: Array<LLMAssistantPromptTemplates>;
  /**
   * Large Language Model to use for the job
   */
  model: string;
};
