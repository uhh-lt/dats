/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocumentTagRead } from "./DocumentTagRead";
export type TagStat = {
  /**
   * The counted document tag.
   */
  tag: DocumentTagRead;
  /**
   * Number of occurrences of the document tag in the filtered documents
   */
  filtered_count: number;
  /**
   * Number of occurrences of the document tag in all documents
   */
  global_count: number;
};
