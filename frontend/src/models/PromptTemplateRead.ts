/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptLanguage } from "./PromptLanguage";
import type { PromptTemplateVersionRead } from "./PromptTemplateVersionRead";
import type { TaskType } from "./TaskType";
export type PromptTemplateRead = {
  /**
   * Name of the prompt template
   */
  name: string;
  /**
   * The task the template is for
   */
  task_type: TaskType;
  /**
   * The language of the template, it decides the text of the blocks
   */
  language: PromptLanguage;
  /**
   * ID of the prompt template
   */
  id: number;
  /**
   * Project the prompt template belongs to
   */
  project_id: number;
  /**
   * Archived templates are no longer offered for new runs
   */
  is_archived: boolean;
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
