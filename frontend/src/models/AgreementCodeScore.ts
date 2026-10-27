/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AgreementCodeScore = {
  /**
   * Units that carry the code in the reference and in the comparison
   */
  true_positives: number;
  /**
   * Units that carry the code in the comparison only
   */
  false_positives: number;
  /**
   * Units that carry the code in the reference only
   */
  false_negatives: number;
  /**
   * TP / (TP + FP), null if there are no positive predictions
   */
  precision: number | null;
  /**
   * TP / (TP + FN), null if the reference has no positives
   */
  recall: number | null;
  /**
   * 2 TP / (2 TP + FP + FN), null if all counts are zero
   */
  f1: number | null;
  /**
   * ID of the Code the scores refer to
   */
  code_id: number;
};
