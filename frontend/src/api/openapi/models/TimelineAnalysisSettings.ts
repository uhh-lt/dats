/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DateGroupBy } from "./DateGroupBy";
import type { TimelineAnalysisResultType } from "./TimelineAnalysisResultType";
export type TimelineAnalysisSettings = {
  /**
   * Group by date
   */
  group_by?: DateGroupBy;
  /**
   * ID of the Project Date Metadata that is used for the TimelineAnalysis
   */
  date_metadata_id?: number | null;
  /**
   * ResultType of the TimelineAnalysis
   */
  result_type?: TimelineAnalysisResultType;
};
