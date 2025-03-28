/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { ImportJobParameters } from "./ImportJobParameters";
export type ImportJobRead = {
  /**
   * Status of the ImportJob
   */
  status?: BackgroundJobStatus;
  /**
   * Error message (if any)
   */
  error?: string | null;
  /**
   * ID of the ImportJob
   */
  id: string;
  /**
   * Created timestamp of the ImportJob
   */
  created: string;
  /**
   * Updated timestamp of the ImportJob
   */
  updated: string;
  /**
   * The parameters of the import job that defines what to import!
   */
  parameters: ImportJobParameters;
};
