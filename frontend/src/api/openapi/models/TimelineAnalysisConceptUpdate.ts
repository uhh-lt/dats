/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnoTimelineAnalysisFilter_Input } from "./BBoxAnnoTimelineAnalysisFilter_Input";
import type { SdocTimelineAnalysisFilter_Input } from "./SdocTimelineAnalysisFilter_Input";
import type { SentAnnoTimelineAnalysisFilter_Input } from "./SentAnnoTimelineAnalysisFilter_Input";
import type { SpanAnnoTimelineAnalysisFilter_Input } from "./SpanAnnoTimelineAnalysisFilter_Input";
export type TimelineAnalysisConceptUpdate = {
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
    | SdocTimelineAnalysisFilter_Input
    | SentAnnoTimelineAnalysisFilter_Input
    | SpanAnnoTimelineAnalysisFilter_Input
    | BBoxAnnoTimelineAnalysisFilter_Input;
};
