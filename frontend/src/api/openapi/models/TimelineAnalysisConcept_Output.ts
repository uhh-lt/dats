/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Filter_TimelineAnalysisColumns__Output } from "./Filter_TimelineAnalysisColumns__Output";

export type TimelineAnalysisConcept_Output = {
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
  filter: Filter_TimelineAnalysisColumns__Output;
};
