/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SourceDocumentMetadataCreate = {
  /**
   * Int Value of the SourceDocumentMetadata
   */
  int_value: number | null;
  /**
   * String Value of the SourceDocumentMetadata
   */
  str_value: string | null;
  /**
   * Boolean Value of the SourceDocumentMetadata
   */
  boolean_value: boolean | null;
  /**
   * Date Value of the SourceDocumentMetadata
   */
  date_value: string | null;
  /**
   * List Value of the SourceDocumentMetadata
   */
  list_value: Array<string> | null;
  /**
   * SourceDocument the SourceDocumentMetadata belongs to
   */
  source_document_id: number;
  /**
   * ID of the ProjectMetadata
   */
  project_metadata_id: number;
};
