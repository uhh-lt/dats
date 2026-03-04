/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FolderType } from "./FolderType";
export type FolderCreate = {
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
};
