/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnoTimelineAnalysisFilter_Output } from "./BBoxAnnoTimelineAnalysisFilter_Output";
import type { SdocTimelineAnalysisFilter_Output } from "./SdocTimelineAnalysisFilter_Output";
import type { SentAnnoTimelineAnalysisFilter_Output } from "./SentAnnoTimelineAnalysisFilter_Output";
import type { SpanAnnoTimelineAnalysisFilter_Output } from "./SpanAnnoTimelineAnalysisFilter_Output";
import type { TimelineAnalysisResult } from "./TimelineAnalysisResult";
import type { TimelineAnalysisType } from "./TimelineAnalysisType";
export type TimelineAnalysisConcept = {
  /**
   * Type of the Timeline Analysis
   */
  timeline_analysis_type: TimelineAnalysisType;
  /**
   * ID of the Concept
   */
  id: string;
  /**
   * Name of the Concept
   */
  name: string;
  /**
   * Description of the Concept
   */
  description: string;
  /**
   * Color of the Concept
   */
  color: string;
  /**
   * Visibility of the Concept
   */
  visible: boolean;
  /**
   * List of Concepts that are part of the TimelineAnalysis
   */
  ta_specific_filter:
    | SdocTimelineAnalysisFilter_Output
    | SentAnnoTimelineAnalysisFilter_Output
    | SpanAnnoTimelineAnalysisFilter_Output
    | BBoxAnnoTimelineAnalysisFilter_Output;
  /**
   * Hash of the filter to identify changes
   */
  filter_hash: number;
  /**
   * List of Results of the TimelineAnalysis
   */
  results: Array<TimelineAnalysisResult>;
};
