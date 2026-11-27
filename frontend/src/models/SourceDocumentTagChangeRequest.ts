/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SourceDocumentTagChangeRequest = {
  /**
   * The SourceDocuments to change
   */
  source_document_ids: Array<number>;
  /**
   * The Tags to link
   */
  link_tag_ids: Array<number>;
  /**
   * The Tags to unlink
   */
  unlink_tag_ids: Array<number>;
};
