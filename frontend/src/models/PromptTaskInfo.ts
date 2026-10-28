/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocumentUnitInfo } from "./DocumentUnitInfo";
import type { OutputFormatInfo } from "./OutputFormatInfo";
import type { PromptBlock } from "./PromptBlock";
import type { PromptBlockInfo } from "./PromptBlockInfo";
import type { PromptExampleKind } from "./PromptExampleKind";
import type { TaskType } from "./TaskType";
/**
 * Describes the blocks a prompt of a task can use.
 */
export type PromptTaskInfo = {
  /**
   * The task
   */
  task_type: TaskType;
  /**
   * The document blocks; a prompt contains exactly one
   */
  document_units: Array<DocumentUnitInfo>;
  /**
   * The output format blocks; a prompt contains exactly one
   */
  output_formats: Array<OutputFormatInfo>;
  /**
   * The selection blocks
   */
  blocks: Array<PromptBlockInfo>;
  /**
   * The prompt contains at least one of these blocks
   */
  required_blocks: Array<PromptBlock>;
  /**
   * The kind of few-shot examples, None if the task supports none
   */
  example_kind: PromptExampleKind | null;
};
