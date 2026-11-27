/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_SdocColumns__Input } from "./Filter_SdocColumns__Input";
export type SimSearchRequest = {
  /**
   * A text, or the ID of a SourceDocument (image) or sentence to compare to
   */
  query: string | number;
  /**
   * Number of hits to return
   */
  top_k: number;
  /**
   * Minimum similarity of a hit
   */
  threshold: number;
  /**
   * Filter on the SourceDocuments to search in
   */
  filter: Filter_SdocColumns__Input;
};
