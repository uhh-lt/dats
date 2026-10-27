/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AgreementAnnotationType } from "./AgreementAnnotationType";
import type { AgreementCodeScore } from "./AgreementCodeScore";
import type { AgreementScore } from "./AgreementScore";
import type { AgreementScoring } from "./AgreementScoring";
import type { AgreementSegment } from "./AgreementSegment";
export type AgreementResult = {
  /**
   * The kind of annotations that were compared
   */
  annotation_type: AgreementAnnotationType;
  /**
   * The scoring of the result
   */
  scoring: AgreementScoring;
  /**
   * ID of the reference annotator
   */
  reference_user_id: number;
  /**
   * ID of the compared annotator
   */
  compared_user_id: number;
  /**
   * Number of units that carry a code on at least one side
   */
  num_units: number;
  /**
   * Scores over all codes (micro average: the counts are summed)
   */
  total: AgreementScore;
  /**
   * Scores per code, in the order of the requested codes
   */
  code_scores: Array<AgreementCodeScore>;
  /**
   * Code IDs labeling the rows and columns of the confusion matrix. The last entry is null and stands for 'no code'.
   */
  confusion_matrix_code_ids: Array<number | null>;
  /**
   * Confusion matrix: cell [i][j] counts the units that carry code i in the reference and code j in the comparison. A unit with several codes is counted in every combination of them.
   */
  confusion_matrix: Array<Array<number>>;
  /**
   * All segments, agreeing and disagreeing, sorted by document and position
   */
  segments: Array<AgreementSegment>;
};
