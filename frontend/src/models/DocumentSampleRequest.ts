/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DocumentSampleRequest = {
  /**
   * Groups of Tags; the documents are sampled per group
   */
  tag_groups: Array<Array<number>>;
  /**
   * Number of documents to sample per group
   */
  n: number;
  /**
   * Fraction of the documents to sample per group
   */
  frac: number;
};
