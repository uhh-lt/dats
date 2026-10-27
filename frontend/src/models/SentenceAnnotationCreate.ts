/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SentenceAnnotationCreate = {
  /**
   * Start sentence ID of the SentenceAnnotation
   */
  sentence_id_start: number;
  /**
   * End sentence ID of the SentenceAnnotation
   */
  sentence_id_end: number;
  /**
   * Code the SentenceAnnotation refers to
   */
  code_id: number;
  /**
   * SourceDocument the SentenceAnnotation refers to
   */
  sdoc_id: number;
  /**
   * SentenceAnnotation this one is copied from (e.g. accepted in the annotation comparison); records the provenance
   */
  source_annotation_id?: number | null;
};
