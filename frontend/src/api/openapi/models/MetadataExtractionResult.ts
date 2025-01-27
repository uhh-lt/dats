/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { SourceDocumentMetadataReadResolved } from "./SourceDocumentMetadataReadResolved";
export type MetadataExtractionResult = {
  /**
   * Status of the Result
   */
  status: BackgroundJobStatus;
  /**
   * Status message of the result
   */
  status_message: string;
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
