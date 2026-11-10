/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocType } from "./DocType";
import type { SDocStatus } from "./SDocStatus";
export type SourceDocumentStatusSimple = {
  /**
   * Filename of the SourceDocument
   */
  filename: string;
  /**
   * User-defined name of the document (default is the filename)
   */
  name: string;
  /**
   * DOCTYPE of the SourceDocument
   */
  doctype: DocType;
  /**
   * Project the SourceDocument belongs to
   */
  project_id: number;
  /**
   * ID of the SourceDocument
   */
  id: number;
  /**
   * Number of finished jobs
   */
  processed_jobs: number;
  /**
   * Number of planned jobs
   */
  total_jobs: number;
  /**
   * Overall processing status: erroneous if any job failed, processing if any job is pending, finished otherwise
   */
  processed_status: SDocStatus;
};
