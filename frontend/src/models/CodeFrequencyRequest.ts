/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocType } from "./DocType";
export type CodeFrequencyRequest = {
  /**
   * The Codes to count
   */
  code_ids: Array<number>;
  /**
   * The Users whose annotations are counted
   */
  user_ids: Array<number>;
  /**
   * The document types to count in
   */
  doctypes: Array<DocType>;
};
