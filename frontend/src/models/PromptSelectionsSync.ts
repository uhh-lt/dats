/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptCode } from "./PromptCode";
import type { PromptMetadataField } from "./PromptMetadataField";
import type { PromptTag } from "./PromptTag";
/**
 * Selections of a prompt to pull from or push to the project.
 */
export type PromptSelectionsSync = {
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
  /**
   * Project the selections belong to
   */
  project_id: number;
};
