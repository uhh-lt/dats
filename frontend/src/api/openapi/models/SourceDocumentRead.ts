/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocType } from "./DocType";
export type SourceDocumentRead = {
  /**
   * Filename of the SourceDocument
   */
  filename: string;
  /**
   * User-defined name of the document (defaults is the filename)
   */
  name: string;
  /**
   * DOCTYPE of the SourceDocument
   */
  doctype: DocType;
  /**
   * Project the SourceDocument belongs to
   */
  project_id: number;
  /**
   * ID of the SourceDocument
   */
  id: number;
  /**
   * The created timestamp of the SourceDocument
   */
  created: string;
  /**
   * Updated timestamp of the SourceDocument
   */
  updated: string;
  /**
   * ID of the Folder this SourceDocument belongs to
   */
  folder_id: number;
};
