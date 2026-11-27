/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AnnoscalingSuggest = {
  /**
   * Code to provide suggestions for
   */
  code_id: number;
  /**
   * Code to use as opposing code
   */
  reject_code_id: number;
  /**
   * Number of suggestions to provide
   */
  top_k: number;
};
