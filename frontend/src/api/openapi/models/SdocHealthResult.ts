/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SdocStatusRow } from "./SdocStatusRow";
export type SdocHealthResult = {
  /**
   * Total number of sdocs in the project
   */
  total_results: number;
  /**
   * List of SourceDocument status rows (one per sdoc in the project)
   */
  data: Array<SdocStatusRow>;
};
