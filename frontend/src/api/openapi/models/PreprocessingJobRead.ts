/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { PreprocessingJobPayloadRead } from "./PreprocessingJobPayloadRead";
export type PreprocessingJobRead = {
  /**
   * UUID of the PreprocessingJob
   */
  id: string;
  /**
   * Status of the PreprocessingJob
   */
  status?: BackgroundJobStatus;
  /**
   * The ID of the Project.
   */
  project_id: number;
  /**
   * Created timestamp of the PreprocessingJob
   */
  created: string;
  /**
   * Updated timestamp of the PreprocessingJob
   */
  updated: string;
  /**
   * Payloads of the PreprocessingJobs, i.e., documents to be preprocessed and imported to the project within this PreprocessingJob
   */
  payloads: Array<PreprocessingJobPayloadRead>;
};
