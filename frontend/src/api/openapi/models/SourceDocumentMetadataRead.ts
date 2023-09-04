/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SourceDocumentMetadataRead = {
  /**
   * Key of the SourceDocumentMetadata
   */
  key: string;
  /**
   * Value of the SourceDocumentMetadata
   */
  value: string;
  /**
   * ID of the SourceDocumentMetadata
   */
  id: number;
  /**
   * Flag that tells if the SourceDocumentMetadata cannot be changed. Used for system generated metadata! Use False for user metadata.
   */
  read_only?: boolean;
  /**
   * SourceDocument the SourceDocumentMetadata belongs to
   */
  source_document_id: number;
};
