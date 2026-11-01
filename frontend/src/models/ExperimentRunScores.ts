/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AgreementCodeScore } from "./AgreementCodeScore";
import type { AgreementScore } from "./AgreementScore";
import type { AgreementScoring } from "./AgreementScoring";
/**
 * The agreement between the gold annotator and a run with one scoring.
 */
export type ExperimentRunScores = {
  /**
   * How the annotations were split into scoring units
   */
  scoring: AgreementScoring;
  /**
   * Number of units that carry a code on at least one side
   */
  num_units: number;
  /**
   * Scores over all codes (micro average: the counts are summed)
   */
  total: AgreementScore;
  /**
   * Scores per code, in the order of the experiment's codes
   */
  code_scores: Array<AgreementCodeScore>;
};
