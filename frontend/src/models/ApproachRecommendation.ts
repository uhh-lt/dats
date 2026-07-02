/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApproachType } from "./ApproachType";
export type ApproachRecommendation = {
  /**
   * Recommended approach
   */
  recommended_approach: ApproachType;
  /**
   * Reasoning for the recommendation
   */
  reasoning: string;
  /**
   * Available approaches
   */
  available_approaches: Record<string, boolean>;
};
