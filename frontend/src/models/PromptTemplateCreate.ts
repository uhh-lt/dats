/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptCode } from "./PromptCode";
import type { PromptLanguage } from "./PromptLanguage";
import type { PromptMetadataField } from "./PromptMetadataField";
import type { PromptSettings } from "./PromptSettings";
import type { PromptTag } from "./PromptTag";
import type { SentencePromptExample } from "./SentencePromptExample";
import type { SpanPromptExample } from "./SpanPromptExample";
import type { TaskType } from "./TaskType";
export type PromptTemplateCreate = {
  /**
   * The prompt with its blocks
   */
  prompt: string;
  /**
   * Settings of the document and output format blocks
   */
  settings?: PromptSettings;
  /**
   * The codes of <codes> and <code_names>
   */
  codes?: Array<PromptCode>;
  /**
   * The few-shot examples of <examples>
   */
  examples?: Array<SpanPromptExample | SentencePromptExample>;
  /**
   * The tags of <tags>
   */
  tags?: Array<PromptTag>;
  /**
   * The metadata fields of <metadata_fields>
   */
  metadata_fields?: Array<PromptMetadataField>;
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
   * Project the prompt template belongs to
   */
  project_id: number;
};
