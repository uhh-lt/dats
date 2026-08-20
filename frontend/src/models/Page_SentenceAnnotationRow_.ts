/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SentenceAnnotationRow } from "./SentenceAnnotationRow";
export type Page_SentenceAnnotationRow_ = {
  /**
   * The rows on the requested page
   */
  items: Array<SentenceAnnotationRow>;
  /**
   * Total number of matching rows (unpaginated), used for pagination
   */
  total_results: number;
};
