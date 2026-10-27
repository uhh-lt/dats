/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AgreementMode } from "./AgreementMode";
export type AgreementParams = {
  /**
   * IDs of the SourceDocuments to compare
   */
  sdoc_ids: Array<number>;
  /**
   * IDs of the Codes to compare. Annotations with other codes are ignored. The order defines the order of the scores and the confusion matrix.
   */
  code_ids: Array<number>;
  /**
   * ID of the reference annotator (gold standard)
   */
  reference_user_id: number;
  /**
   * ID of the annotator compared with the reference
   */
  compared_user_id: number;
  /**
   * How the annotations are split into scoring units
   */
  mode: AgreementMode;
};
