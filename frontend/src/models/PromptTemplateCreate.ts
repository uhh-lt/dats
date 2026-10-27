/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LLMAssistantPromptTemplates } from "./LLMAssistantPromptTemplates";
import type { StrategyType } from "./StrategyType";
import type { TaskType } from "./TaskType";
export type PromptTemplateCreate = {
  /**
   * Name of the prompt template
   */
  name: string;
  /**
   * The LLM assistant task of the template
   */
  task_type: TaskType;
  /**
   * The strategy that renders the template
   */
  strategy_type: StrategyType;
  /**
   * Project the prompt template belongs to
   */
  project_id: number;
  /**
   * The prompts of the first version, one per supported language
   */
  prompts: Array<LLMAssistantPromptTemplates>;
};
