/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MetadataFrequencyRead = {
  /**
   * The unique metadata value
   */
  value: string | number | boolean | null;
  /**
   * Number of documents that have this value
   */
  count: number;
  /**
   * Percentage of documents that have this value (between 0 and 1)
   */
  percentage: number;
};
