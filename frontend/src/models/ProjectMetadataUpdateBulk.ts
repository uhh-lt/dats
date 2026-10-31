/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetaType } from "./MetaType";
export type ProjectMetadataUpdateBulk = {
  /**
   * Key of the ProjectMetadata
   */
  key?: string | null;
  /**
   * Type of the ProjectMetadata
   */
  metatype?: MetaType | null;
  /**
   * Description of the ProjectMetadata
   */
  description?: string | null;
  /**
   * ID of the ProjectMetadata to update
   */
  project_metadata_id: number;
};
