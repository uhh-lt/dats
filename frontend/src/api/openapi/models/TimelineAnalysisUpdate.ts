/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TimelineAnalysisConcept_Input } from "./TimelineAnalysisConcept_Input";
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
  concepts?: Array<TimelineAnalysisConcept_Input> | null;
};
