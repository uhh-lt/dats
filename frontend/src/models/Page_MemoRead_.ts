/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MemoRead } from "./MemoRead";
export type Page_MemoRead_ = {
  /**
   * The rows on the requested page
   */
  items: Array<MemoRead>;
  /**
   * Total number of matching rows (unpaginated), used for pagination
   */
  total_results: number;
};
