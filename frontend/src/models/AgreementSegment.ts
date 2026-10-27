/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A stretch of consecutive units of one document with the same codes on both sides.
 *
 * With exact scoring, every segment is exactly one annotation boundary pair (the
 * same first and last word or sentence). With constituent scoring, neighboring
 * words or sentences are merged as long as both annotators assign them the same
 * codes.
 */
export type AgreementSegment = {
  /**
   * ID of the SourceDocument of the segment
   */
  sdoc_id: number;
  /**
   * Begin of the segment in characters
   */
  begin: number;
  /**
   * End of the segment in characters (exclusive)
   */
  end: number;
  /**
   * Begin of the segment in tokens (span annotations only)
   */
  begin_token: number | null;
  /**
   * End of the segment in tokens, exclusive (span annotations only)
   */
  end_token: number | null;
  /**
   * First sentence of the segment (sentence annotations only)
   */
  sentence_id_start: number | null;
  /**
   * Last sentence of the segment, inclusive (sentence annotations only)
   */
  sentence_id_end: number | null;
  /**
   * Number of units (annotations, words or sentences)
   */
  num_units: number;
  /**
   * Text of the segment
   */
  text: string;
  /**
   * Codes the reference annotator assigned to the segment
   */
  reference_code_ids: Array<number>;
  /**
   * Codes the compared annotator assigned to the segment
   */
  compared_code_ids: Array<number>;
  /**
   * Codes assigned by both
   */
  true_positive_code_ids: Array<number>;
  /**
   * Codes assigned by the reference annotator only
   */
  false_negative_code_ids: Array<number>;
  /**
   * Codes assigned by the compared annotator only
   */
  false_positive_code_ids: Array<number>;
  /**
   * IDs of the reference annotator's annotations in the segment
   */
  reference_annotation_ids: Array<number>;
  /**
   * IDs of the compared annotator's annotations in the segment
   */
  compared_annotation_ids: Array<number>;
};
