/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptCode } from "./PromptCode";
import type { PromptMetadataField } from "./PromptMetadataField";
import type { PromptTag } from "./PromptTag";
/**
 * Codes, tags and metadata fields of a prompt, defined as in a prompt or the project.
 */
export type PromptSelections = {
  /**
   * The codes of <codes> and <code_names>
   */
  codes?: Array<PromptCode>;
  /**
   * The tags of <tags>
   */
  tags?: Array<PromptTag>;
  /**
   * The metadata fields of <metadata_fields>
   */
  metadata_fields?: Array<PromptMetadataField>;
};
