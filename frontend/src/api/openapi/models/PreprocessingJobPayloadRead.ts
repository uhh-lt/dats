/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { DocType } from "./DocType";
export type PreprocessingJobPayloadRead = {
  /**
   * ID of the PreprocessingJobPayload
   */
  id: string;
  /**
   * UUID of the PreprocessingJob this payload belongs to.
   */
  prepro_job_id: string;
  /**
   * ID of the Project of the PreprocessingJobPayload
   */
  project_id: number;
  /**
   * ID of the SourceDocument that was created from the payload.
   */
  source_document_id?: number | null;
  /**
   * The current status of the payload.
   */
  status?: BackgroundJobStatus;
  /**
   * The filename of the document to be preprocessed.
   */
  filename: string;
  /**
   * The MIME type of the payload file.
   */
  mime_type: string;
  /**
   * The DocType of the payload file.
   */
  doc_type: DocType;
  /**
   * The current step in the preprocessing pipeline.
   */
  current_pipeline_step?: string | null;
  /**
   * The error message if the payload failed.
   */
  error_message?: string | null;
};
