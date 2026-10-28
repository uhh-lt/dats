/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetaType } from "./MetaType";
/**
 * A metadata field selected in a prompt, as it was when the prompt was saved.
 */
export type PromptMetadataField = {
  /**
   * ID of the project metadata
   */
  project_metadata_id: number;
  /**
   * Key of the metadata field
   */
  key: string;
  /**
   * Description of the metadata field
   */
  description: string;
  /**
   * Type of the metadata field
   */
  metatype: MetaType;
};
