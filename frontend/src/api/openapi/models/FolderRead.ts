/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FolderType } from "./FolderType";
export type FolderRead = {
  /**
   * Name of the folder
   */
  name: string;
  /**
   * Type of the folder (normal, sdoc_folder)
   */
  folder_type: FolderType;
  /**
   * ID of the parent folder (nullable)
   */
  parent_id?: number | null;
  /**
   * ID of the project this folder belongs to (nullable)
   */
  project_id: number;
  /**
   * ID of the Folder
   */
  id: number;
  /**
   * Creation timestamp of the folder
   */
  created: string;
  /**
   * Update timestamp of the folder
   */
  updated: string;
};
