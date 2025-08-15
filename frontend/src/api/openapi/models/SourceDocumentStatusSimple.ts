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
   * User-defined name of the document
   */
  name?: string | null;
  /**
   * DOCTYPE of the SourceDocument
   */
  doctype: DocType;
  /**
   * Project the SourceDocument belongs to
   */
  project_id: number;
  /**
   * Number of processed jobs (depending on the doctype)
   */
  processed_jobs: number;
  /**
   * Total number of jobs (depending on the doctype)
   */
  total_jobs: number;
  /**
   * Overall processing status. Results from processed_jobs and total_jobs
   */
  processed_status: SDocStatus;
};
