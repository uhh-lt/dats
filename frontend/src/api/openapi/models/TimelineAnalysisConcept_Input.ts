/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_TimelineAnalysisColumns__Input } from "./Filter_TimelineAnalysisColumns__Input";
export type TimelineAnalysisConcept_Input = {
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
   * The filter of the Concept
   */
  filter: Filter_TimelineAnalysisColumns__Input;
};
