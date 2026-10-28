/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptTemplateSnapshot } from "./PromptTemplateSnapshot";
import type { TaskType } from "./TaskType";
/**
 * Runs a prompt on documents: a stored prompt template version or a draft.
 *
 * The prompt decides everything but the documents and the model: the task, the
 * selected codes, tags or metadata fields, the examples (few-shot if it shows
 * any), how documents are split and the answer format.
 */
export type LLMAssistantJobInput = {
  /**
   * Project ID associated with the job
   */
  project_id: number;
  /**
   * The task of the prompt
   */
  task_type: TaskType;
  /**
   * IDs of the source documents to process
   */
  sdoc_ids: Array<number>;
  /**
   * Large Language Model to use for the job
   */
  model: string;
  /**
   * ID of the prompt template version to run. Exactly one of prompt_template_version_id and draft is set.
   */
  prompt_template_version_id?: number | null;
  /**
   * An unsaved prompt to run, e.g. the prompt of the wizard. Exactly one of prompt_template_version_id and draft is set.
   */
  draft?: PromptTemplateSnapshot | null;
  /**
   * Delete the existing annotations of the assistant for the documents and codes of the prompt before creating new ones
   */
  delete_existing_annotations?: boolean;
};
