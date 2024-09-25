/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SourceDocumentMetadataReadResolved } from "./SourceDocumentMetadataReadResolved";
export type MetadataExtractionResult = {
  /**
   * ID of the source document
   */
  sdoc_id: number;
  /**
   * Current metadata
   */
  current_metadata: Array<SourceDocumentMetadataReadResolved>;
  /**
   * Suggested metadata
   */
  suggested_metadata: Array<SourceDocumentMetadataReadResolved>;
};
