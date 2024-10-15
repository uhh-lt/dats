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
   * ID of the ImportJob
   */
  id: string;
  /**
   * The parameters of the import job that defines what to import!
   */
  parameters: ImportJobParameters;
  /**
   * Created timestamp of the ImportJob
   */
  created: string;
};
