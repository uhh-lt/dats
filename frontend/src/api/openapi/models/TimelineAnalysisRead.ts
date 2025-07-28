/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TimelineAnalysisConcept } from "./TimelineAnalysisConcept";
import type { TimelineAnalysisSettings } from "./TimelineAnalysisSettings";
import type { TimelineAnalysisType } from "./TimelineAnalysisType";
export type TimelineAnalysisRead = {
  /**
   * Name of the TimelineAnalysis
   */
  name: string;
  /**
   * The type of the TimelineAnalysis
   */
  timeline_analysis_type: TimelineAnalysisType;
  /**
   * ID of the TimelineAnalysis
   */
  id: number;
  /**
   * Project the TimelineAnalysis belongs to
   */
  project_id: number;
  /**
   * Timeline Analysis Settings of the TimelineAnalysis.
   */
  settings: TimelineAnalysisSettings;
  /**
   * List of Concepts that are part of the TimelineAnalysis
   */
  concepts: Array<TimelineAnalysisConcept>;
  /**
   * Created timestamp of the TimelineAnalysis
   */
  created: string;
  /**
   * Updated timestamp of the TimelineAnalysis
   */
  updated: string;
};
