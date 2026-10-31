/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptLanguage } from "./PromptLanguage";
import type { PromptVersionRead } from "./PromptVersionRead";
import type { TaskType } from "./TaskType";
export type PromptRead = {
  /**
   * Name of the prompt
   */
  name: string;
  /**
   * The task the prompt is for
   */
  task_type: TaskType;
  /**
   * The language of the prompt, it decides the text of the blocks
   */
  language: PromptLanguage;
  /**
   * ID of the prompt
   */
  id: number;
  /**
   * Project the prompt belongs to
   */
  project_id: number;
  /**
   * Archived prompts are no longer offered for new runs
   */
  is_archived: boolean;
  /**
   * Created timestamp of the prompt
   */
  created: string;
  /**
   * Updated timestamp of the prompt
   */
  updated: string;
  /**
   * All versions of the prompt, oldest first
   */
  versions: Array<PromptVersionRead>;
};
