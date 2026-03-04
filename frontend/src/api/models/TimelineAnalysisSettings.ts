/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DateGroupBy } from "./DateGroupBy";
import type { TAAnnotationAggregationType } from "./TAAnnotationAggregationType";
export type TimelineAnalysisSettings = {
  /**
   * Group by date
   */
  group_by?: DateGroupBy;
  /**
   * The type of the annotation aggregation (only for TimelineAnalysisType != DOCUMENT)
   */
  annotation_aggregation_type?: TAAnnotationAggregationType | null;
  /**
   * ID of the Project Date Metadata that is used for the TimelineAnalysis
   */
  date_metadata_id?: number | null;
};
