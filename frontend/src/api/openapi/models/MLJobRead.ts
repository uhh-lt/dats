/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { MLJobParameters_Output } from "./MLJobParameters_Output";
export type MLJobRead = {
  /**
   * Status of the MLJob
   */
  status?: BackgroundJobStatus;
  /**
   * Error message (if any)
   */
  error?: string | null;
  /**
   * ID of the MLJob
   */
  id: string;
  /**
   * Created timestamp of the MLJob
   */
  created: string;
  /**
   * Updated timestamp of the MLJob
   */
  updated: string;
  /**
   * The parameters of the MLJob that defines what to do!
   */
  parameters: MLJobParameters_Output;
};
