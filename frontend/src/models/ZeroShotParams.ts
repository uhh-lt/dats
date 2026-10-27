/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LLMAssistantPromptTemplates } from "./LLMAssistantPromptTemplates";
export type ZeroShotParams = {
  /**
   * The prompt templates to use, one per supported language. Exactly one of prompts and prompt_template_version_id is set.
   */
  prompts?: Array<LLMAssistantPromptTemplates> | null;
  /**
   * ID of the stored prompt template version to use. Exactly one of prompts and prompt_template_version_id is set.
   */
  prompt_template_version_id?: number | null;
  /**
   * The approach of the LLM Assistant job
   */
  approach_type: string;
  /**
   * Large Language Model to use for the job
   */
  model: string;
};
