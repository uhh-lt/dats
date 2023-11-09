/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SourceDocumentMetadataCreate = {
  /**
   * Int Value of the SourceDocumentMetadata
   */
  int_value?: number;
  /**
   * String Value of the SourceDocumentMetadata
   */
  str_value?: string;
  /**
   * Boolean Value of the SourceDocumentMetadata
   */
  boolean_value?: boolean;
  /**
   * Date Value of the SourceDocumentMetadata
   */
  date_value?: string;
  /**
   * List Value of the SourceDocumentMetadata
   */
  list_value?: Array<string>;
  /**
   * SourceDocument the SourceDocumentMetadata belongs to
   */
  source_document_id: number;
  /**
   * ID of the ProjectMetadata
   */
  project_metadata_id: number;
};
