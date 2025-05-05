/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TimelineAnalysisConceptUpdate } from "./TimelineAnalysisConceptUpdate";
import type { TimelineAnalysisSettings } from "./TimelineAnalysisSettings";
export type TimelineAnalysisUpdate = {
  /**
   * Name of the TimelineAnalysis
   */
  name?: string | null;
  /**
   * Settings of the TimelineAnalysis.
   */
  settings?: TimelineAnalysisSettings | null;
  /**
   * List of Concepts that are part of the TimelineAnalysis
   */
  concepts?: Array<TimelineAnalysisConceptUpdate> | null;
};
