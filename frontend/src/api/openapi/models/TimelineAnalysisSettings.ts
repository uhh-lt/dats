/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DateGroupBy } from "./DateGroupBy";
import type { SentAnnoTimelineAnalysisSettings } from "./SentAnnoTimelineAnalysisSettings";
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
   * Settings specific to the TimelineAnalysis
   */
  ta_specific_settings?: SentAnnoTimelineAnalysisSettings | null;
};
