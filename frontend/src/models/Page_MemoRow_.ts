/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MemoRow } from "./MemoRow";
export type Page_MemoRow_ = {
  /**
   * The rows on the requested page
   */
  items: Array<MemoRow>;
  /**
   * Total number of matching rows (unpaginated), used for pagination
   */
  total_results: number;
};
