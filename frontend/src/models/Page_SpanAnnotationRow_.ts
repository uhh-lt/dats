/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanAnnotationRow } from "./SpanAnnotationRow";
export type Page_SpanAnnotationRow_ = {
  /**
   * The rows on the requested page
   */
  items: Array<SpanAnnotationRow>;
  /**
   * Total number of matching rows (unpaginated), used for pagination
   */
  total_results: number;
};
