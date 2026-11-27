/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_WordFrequencyColumns_ } from "./Filter_WordFrequencyColumns_";
import type { Sort_WordFrequencyColumns_ } from "./Sort_WordFrequencyColumns_";
export type WordFrequencySearchRequest = {
  /**
   * Column filter tree
   */
  filter: Filter_WordFrequencyColumns_;
  /**
   * Ordered sort expressions
   */
  sorts?: Array<Sort_WordFrequencyColumns_>;
  /**
   * Zero-based page index
   */
  page_number?: number;
  /**
   * Number of rows per page
   */
  page_size?: number;
};
