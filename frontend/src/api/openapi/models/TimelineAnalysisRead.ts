/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { TimelineAnalysisConcept_Output } from "./TimelineAnalysisConcept_Output";
import type { TimelineAnalysisSettings } from "./TimelineAnalysisSettings";

export type TimelineAnalysisRead = {
  /**
   * Name of the TimelineAnalysis
   */
  name: string;
  /**
   * ID of the TimelineAnalysis
   */
  id: number;
  /**
   * User the TimelineAnalysis belongs to
   */
  user_id: number;
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
  concepts: Array<TimelineAnalysisConcept_Output>;
  /**
   * Created timestamp of the TimelineAnalysis
   */
  created: string;
  /**
   * Updated timestamp of the TimelineAnalysis
   */
  updated: string;
};
