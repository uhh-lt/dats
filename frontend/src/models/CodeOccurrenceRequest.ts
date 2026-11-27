/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocType } from "./DocType";
export type CodeOccurrenceRequest = {
  /**
   * The Code whose occurrences are listed
   */
  code_id: number;
  /**
   * Whether to include the child Codes
   */
  return_children: boolean;
  /**
   * The Users whose annotations are listed
   */
  user_ids: Array<number>;
  /**
   * The document types to list from
   */
  doctypes: Array<DocType>;
};
