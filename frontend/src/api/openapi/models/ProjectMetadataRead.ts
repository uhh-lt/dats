/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocType } from "./DocType";
import type { MetaType } from "./MetaType";
export type ProjectMetadataRead = {
  /**
   * Key of the ProjectMetadata
   */
  key: string;
  /**
   * Type of the ProjectMetadata
   */
  metatype: MetaType;
  /**
   * Flag that tells if the ProjectMetadata cannot be changed. Used for system generated metadata! Use False for user metadata.
   */
  read_only?: boolean;
  /**
   * DOCTYPE of the SourceDocument this metadata refers to
   */
  doctype: DocType;
  /**
   * Description of the ProjectMetadata
   */
  description: string;
  /**
   * ID of the ProjectMetadata
   */
  id: number;
  /**
   * Project the ProjectMetadata belongs to
   */
  project_id: number;
};
