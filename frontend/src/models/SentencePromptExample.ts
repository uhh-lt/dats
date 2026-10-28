/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * The sentences of a sentence annotation and its code.
 */
export type SentencePromptExample = {
  /**
   * ID of the source document the text comes from
   */
  sdoc_id: number;
  /**
   * IDs of the annotations the example was created from
   */
  source_annotation_ids: Array<number>;
  /**
   * The text of the example
   */
  text: string;
  /**
   * The kind of annotation the example shows
   */
  kind: string;
  /**
   * ID of the code of the sentences
   */
  code_id: number;
};
