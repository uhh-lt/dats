/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_SdocColumns__Input } from "./Filter_SdocColumns__Input";
import type { Sort_SdocColumns_ } from "./Sort_SdocColumns_";
export type VisualizationRequest = {
  /**
   * Full-text query that marks the matching documents
   */
  search_query: string;
  /**
   * Column filter tree
   */
  filter: Filter_SdocColumns__Input;
  /**
   * Ordered sort expressions
   */
  sorts?: Array<Sort_SdocColumns_>;
};
