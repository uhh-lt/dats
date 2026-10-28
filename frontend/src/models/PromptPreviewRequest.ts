/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptTemplateSnapshot } from "./PromptTemplateSnapshot";
/**
 * Renders a stored version or an unsaved draft for one message of a document.
 */
export type PromptPreviewRequest = {
  /**
   * Project of the prompt and the document
   */
  project_id: number;
  /**
   * ID of the stored prompt template version to render. Exactly one of prompt_template_version_id and draft is set.
   */
  prompt_template_version_id?: number | null;
  /**
   * An unsaved prompt to render. Exactly one of prompt_template_version_id and draft is set.
   */
  draft?: PromptTemplateSnapshot | null;
  /**
   * ID of the source document to render into <document:unit>; None keeps the block as it is
   */
  sdoc_id?: number | null;
  /**
   * Index of the message (sentence or chunk) within the document
   */
  message_index?: number;
};
