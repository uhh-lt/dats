/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TimelineAnalysisType } from "./TimelineAnalysisType";
export type TimelineAnalysisCreate = {
  /**
   * Name of the TimelineAnalysis
   */
  name: string;
  /**
   * The type of the TimelineAnalysis
   */
  timeline_analysis_type: TimelineAnalysisType;
  /**
   * Project the TimelineAnalysis belongs to
   */
  project_id: number;
};
