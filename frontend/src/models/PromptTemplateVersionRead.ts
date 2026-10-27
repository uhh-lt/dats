/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LLMAssistantPromptTemplates } from "./LLMAssistantPromptTemplates";
export type PromptTemplateVersionRead = {
  /**
   * The system and user prompt of every supported language
   */
  prompts: Array<LLMAssistantPromptTemplates>;
  /**
   * ID of the prompt template version
   */
  id: number;
  /**
   * ID of the prompt template the version belongs to
   */
  prompt_template_id: number;
  /**
   * Number of the version within its template (1, 2, 3, ...)
   */
  version: number;
  /**
   * ID of the user who saved the version
   */
  user_id: number | null;
  /**
   * Created timestamp of the version
   */
  created: string;
};
