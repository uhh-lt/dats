/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectMetadataRead } from "./ProjectMetadataRead";
export type SourceDocumentMetadataReadResolved = {
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
   * ID of the SourceDocumentMetadata
   */
  id: number;
  /**
   * SourceDocument the SourceDocumentMetadata belongs to
   */
  source_document_id: number;
  /**
   * ProjectMetadata of the SourceDocumentMetadata
   */
  project_metadata: ProjectMetadataRead;
};
