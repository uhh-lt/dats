/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptTemplateVersionRead } from "./PromptTemplateVersionRead";
import type { StrategyType } from "./StrategyType";
import type { TaskType } from "./TaskType";
export type PromptTemplateRead = {
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
   * ID of the prompt template
   */
  id: number;
  /**
   * Project the prompt template belongs to
   */
  project_id: number;
  /**
   * Created timestamp of the prompt template
   */
  created: string;
  /**
   * Updated timestamp of the prompt template
   */
  updated: string;
  /**
   * All versions of the template, oldest first
   */
  versions: Array<PromptTemplateVersionRead>;
};
