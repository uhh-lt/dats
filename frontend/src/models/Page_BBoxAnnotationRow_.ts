/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationRow } from "./BBoxAnnotationRow";
export type Page_BBoxAnnotationRow_ = {
  /**
   * The rows on the requested page
   */
  items: Array<BBoxAnnotationRow>;
  /**
   * Total number of matching rows (unpaginated), used for pagination
   */
  total_results: number;
};
