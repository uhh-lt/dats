/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A character range of a document, e.g. of an agreement segment.
 */
export type AgreementTextRange = {
  /**
   * ID of the SourceDocument
   */
  sdoc_id: number;
  /**
   * Begin of the range in characters
   */
  begin: number;
  /**
   * End of the range in characters (exclusive)
   */
  end: number;
};
