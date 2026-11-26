/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DuplicateFinderJobStart = {
  /**
   * Number of different words allowed between duplicates
   */
  max_different_words: number;
  /**
   * Tag id to filter source documents. If not provided, all source documents are considered.
   */
  tag_id: number | null;
};
