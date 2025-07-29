/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TagRead } from "./TagRead";
export type TagStat = {
  /**
   * The counted document tag.
   */
  tag: TagRead;
  /**
   * Number of occurrences of the document tag in the filtered documents
   */
  filtered_count: number;
  /**
   * Number of occurrences of the document tag in all documents
   */
  global_count: number;
};
