/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "./CodeRead";
import type { ProjectMetadataRead } from "./ProjectMetadataRead";
import type { TagRead } from "./TagRead";
/**
 * The project's codes, tags and metadata fields after a push.
 */
export type PushedPromptSelections = {
  /**
   * The updated codes
   */
  codes: Array<CodeRead>;
  /**
   * The updated tags
   */
  tags: Array<TagRead>;
  /**
   * The updated metadata fields
   */
  metadata_fields: Array<ProjectMetadataRead>;
};
